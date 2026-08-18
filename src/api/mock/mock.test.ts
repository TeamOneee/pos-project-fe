/**
 * The mock, driven through the real domain clients.
 *
 * Every request here goes transport → envelope → zod schema, so a mock response
 * that does not match docs/07-iterasi-1-api-contract.md fails as a parse error
 * rather than passing quietly. That is what makes these tests worth having:
 * they check the contract, not the mock's own opinion of it.
 */

import { z } from 'zod';

import { request, setTransport } from '@/api/client';
import { authApi } from '@/services/auth';
import { catalogApi } from '@/services/catalog';
import { categoriesApi } from '@/services/categories';
import { dashboardApi } from '@/services/dashboard';
import { healthApi } from '@/services/health';
import { insightsApi } from '@/services/insights';
import { inventoryApi } from '@/services/inventory';
import { merchantApi } from '@/services/merchant';
import { outletsApi } from '@/services/outlets';
import { productsApi } from '@/services/products';
import { staffApi } from '@/services/staff';
import { mintCheckoutRequestId, transactionsApi } from '@/services/transactions';
import {
  conflictCondition,
  insufficientStockDetails,
  isDuplicateEmail,
  isForbidden,
  isInsufficientStock,
  isPriceChanged,
  isUnauthorized,
  priceChangedDetails,
  type ApiError,
} from '@/api/errors';
import { mockTransport } from '@/api/mock/adapter';
import { resetDb } from '@/api/mock/db';
import { clearMockSession } from '@/api/mock/handlers';
import { clearMockScenario, setMockScenario } from '@/api/mock/scenarios';

const OWNER = { email: 'owner@indomart.com', password: 'password123' };
const ADMIN = { email: 'sari@indomart.com', password: 'password123' };
const CASHIER_A = { email: 'budi@indomart.com', password: 'password123' };
const CASHIER_B = { email: 'rudi@indomart.com', password: 'password123' };

/** A period wide enough to cover every seeded sale. */
const PERIOD = { date_from: '2026-08-01T00:00:00+07:00', date_to: '2026-08-31T23:59:59+07:00' };

beforeEach(() => {
  resetDb();
  clearMockSession();
  clearMockScenario();
  setTransport(mockTransport);
});

afterAll(() => setTransport(null));

const signIn = (credentials: { email: string; password: string }) => authApi.login(credentials);

/**
 * The failure a call is expected to produce.
 *
 * `.catch()` widens the result to "the payload or the error", which then needs
 * narrowing at every assertion; this keeps the expectation in one place.
 */
async function failing(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
    throw new Error('expected the request to fail, but it succeeded');
  } catch (error) {
    return error as ApiError;
  }
}

/** A fresh checkout body. §5.2 requires the id, the outlet and the method. */
function checkoutInput(items: { product_id: string; quantity: number }[], outletId = 'otl_a') {
  return {
    checkout_request_id: mintCheckoutRequestId(),
    outlet_id: outletId,
    payment_method: 'CASH' as const,
    items,
  };
}

/* -------------------------------------------------------------------------- */

describe('the seeded dataset', () => {
  beforeEach(() => signIn(OWNER));

  it('is IndoMart Retail with three outlets and five staff', async () => {
    const [merchant, outlets, staff] = await Promise.all([
      merchantApi.get(),
      outletsApi.list(),
      staffApi.list(),
    ]);

    expect(merchant.name).toBe('IndoMart Retail');
    // §2.4: the merchant carries a timezone and no low-stock threshold.
    expect(merchant.timezone).toBe('Asia/Jakarta');
    expect(outlets.total).toBe(3);
    expect(staff.total).toBe(5);
  });

  it('prices products in integer rupiah and carries a base threshold', async () => {
    const products = await productsApi.list({ size: 100 });

    expect(products.total).toBeGreaterThan(10);
    for (const product of products.items) {
      expect(Number.isInteger(product.price)).toBe(true);
      expect(Number.isInteger(product.lowStockThreshold)).toBe(true);
    }
  });

  it('staffs an owner, an admin and three cashiers', async () => {
    const staff = await staffApi.list({ size: 100 });
    const byRole = staff.items.reduce<Record<string, number>>((counts, member) => {
      counts[member.role] = (counts[member.role] ?? 0) + 1;
      return counts;
    }, {});

    expect(byRole).toEqual({ OWNER: 1, ADMIN: 1, CASHIER: 3 });
  });

  it('holds an inactive category with an active product still inside it', async () => {
    const categories = await categoriesApi.list({ size: 100 });
    const inactive = categories.items.filter((category) => !category.isActive);

    expect(inactive.length).toBeGreaterThan(0);

    const products = await productsApi.list({ category_id: inactive[0]!.categoryId, size: 100 });
    expect(products.items.some((product) => product.isActive)).toBe(true);
  });
});

describe('stock levels', () => {
  beforeEach(() => signIn(ADMIN));

  it('resolves the effective threshold from the outlet override, then the product', async () => {
    const rows = await inventoryApi.list({ product_id: 'prd_cc1500', size: 100 });

    const outletA = rows.items.find((row) => row.outletId === 'otl_a');
    const outletC = rows.items.find((row) => row.outletId === 'otl_c');

    // Outlet C overrides Coca Cola to 50; Outlet A inherits the product's 10.
    expect(outletA?.lowStockThresholdOverride).toBeNull();
    expect(outletA?.effectiveLowStockThreshold).toBe(10);
    expect(outletC?.lowStockThresholdOverride).toBe(50);
    expect(outletC?.effectiveLowStockThreshold).toBe(50);
  });

  it('agrees with the server verdict on every row', async () => {
    const rows = await inventoryApi.list({ size: 100 });

    for (const row of rows.items) {
      expect(row.isLowStock).toBe(row.quantity <= row.effectiveLowStockThreshold);
    }
  });

  it('lists the same rows through the low-stock report', async () => {
    const [report, rows] = await Promise.all([
      dashboardApi.lowStock(),
      inventoryApi.list({ low_stock_only: true, size: 100 }),
    ]);

    expect(report.items).toHaveLength(rows.total);
  });

  it('splits the report into low and out-of-stock on quantity alone', async () => {
    const report = await dashboardApi.lowStock();
    const out = report.items.filter((item) => item.quantity === 0);

    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThan(report.items.length);
  });
});

describe('per-outlet threshold overrides', () => {
  beforeEach(() => signIn(ADMIN));

  it('creates a zero-stock inventory row, then falls back to the product base on delete', async () => {
    const product = await productsApi.create({
      name: 'Produk Ambang Baru',
      price: '9000.00',
      category_id: 'cat_minuman',
      low_stock_threshold: 7,
    });

    const override = await inventoryApi.setLowStockThreshold(product.productId, 'otl_a', {
      threshold: 19,
    });
    expect(override).toMatchObject({
      baseLowStockThreshold: 7,
      lowStockThresholdOverride: 19,
      effectiveLowStockThreshold: 19,
    });

    const created = await inventoryApi.list({
      product_id: product.productId,
      outlet_id: 'otl_a',
    });
    expect(created.items[0]).toMatchObject({
      quantity: 0,
      lowStockThresholdOverride: 19,
      effectiveLowStockThreshold: 19,
    });

    await expect(
      inventoryApi.removeLowStockThreshold(product.productId, 'otl_a')
    ).resolves.toBeNull();

    const fallback = await inventoryApi.list({
      product_id: product.productId,
      outlet_id: 'otl_a',
    });
    expect(fallback.items[0]).toMatchObject({
      quantity: 0,
      lowStockThresholdOverride: null,
      effectiveLowStockThreshold: 7,
    });
  });
});

describe('the Owner dashboard', () => {
  beforeEach(() => signIn(OWNER));

  it('reports a summary derived from the seeded sales', async () => {
    const [summary, transactions] = await Promise.all([
      dashboardApi.summary(PERIOD),
      transactionsApi.list({ ...PERIOD, size: 100 }),
    ]);

    expect(summary.transactionCount).toBe(transactions.total);
    // §6.4: the average is the omzet over the count, truncated.
    expect(summary.averageTransactionValue).toBe(
      Math.trunc(summary.omzet / summary.transactionCount)
    );
  });

  it('sums the sales trend to the period omzet', async () => {
    const [summary, trend] = await Promise.all([
      dashboardApi.summary(PERIOD),
      dashboardApi.salesTrend({ ...PERIOD, bucket: 'DAY' }),
    ]);

    const total = trend.points.reduce((sum, point) => sum + point.omzet, 0);
    expect(total).toBe(summary.omzet);
  });

  it('splits revenue across outlets so the parts sum to the whole', async () => {
    const [summary, comparison] = await Promise.all([
      dashboardApi.summary(PERIOD),
      dashboardApi.outletComparison(PERIOD),
    ]);

    const total = comparison.items.reduce((sum, item) => sum + item.omzet, 0);
    expect(total).toBe(summary.omzet);
  });

  it('ranks the same products from both ends of one response', async () => {
    const ranked = await dashboardApi.topProducts({ ...PERIOD, limit: 100 });

    expect(ranked.topSelling.length).toBeGreaterThan(0);
    expect(ranked.topSelling[0]?.omzet).toBeGreaterThanOrEqual(ranked.leastSelling[0]?.omzet ?? 0);
  });

  it('buckets the trading day by hour', async () => {
    const pattern = await dashboardApi.timePattern(PERIOD);

    for (const point of pattern.points) {
      expect(point.hourOfDay).toBeGreaterThanOrEqual(0);
      expect(point.hourOfDay).toBeLessThan(24);
    }
  });

  it('rejects a period the wrong way round', async () => {
    const error = await failing(
      dashboardApi.summary({ date_from: PERIOD.date_to, date_to: PERIOD.date_from })
    );

    expect(error.kind).toBe('validation');
  });
});

describe('the Admin dashboard', () => {
  beforeEach(() => signIn(ADMIN));

  it('reports stock and catalogue counts and no revenue at all', async () => {
    const operations = await dashboardApi.operations();

    expect(operations.inventoryItemCount).toBeGreaterThan(0);
    expect(operations.activeProductCount).toBeGreaterThan(0);
    expect(operations.inactiveCategoryCount).toBeGreaterThan(0);
    // The point of the endpoint: nothing financial is on it.
    expect(Object.keys(operations)).not.toContain('omzet');
  });

  it('narrows to one outlet on request', async () => {
    const [all, one] = await Promise.all([
      dashboardApi.operations(),
      dashboardApi.operations({ outlet_id: 'otl_a' }),
    ]);

    expect(one.outletId).toBe('otl_a');
    expect(one.inventoryItemCount).toBeLessThan(all.inventoryItemCount);
  });
});

describe('authentication and role gating', () => {
  it('rejects a bad password with 401', async () => {
    const error = await signIn({ ...OWNER, password: 'wrong' }).catch((caught: unknown) => caught);
    expect(isUnauthorized(error)).toBe(true);
  });

  it('rejects an unknown email with the same 401', async () => {
    const error = await signIn({ email: 'nobody@indomart.com', password: 'password123' }).catch(
      (caught: unknown) => caught
    );
    expect(isUnauthorized(error)).toBe(true);
  });

  it('answers 401 when there is no session at all', async () => {
    const error = await productsApi.list().catch((caught: unknown) => caught);
    expect(isUnauthorized(error)).toBe(true);
  });

  it('returns claims rather than a user object', async () => {
    const result = await signIn(CASHIER_A);

    expect(result.role).toBe('CASHIER');
    expect(result.outletId).toBe('otl_a');
    expect(result.expiresIn).toBe(900);
    // §1.2: no name, no email, no user object.
    expect(Object.keys(result)).not.toContain('user');
  });

  it('keeps staff management to the Owner', async () => {
    await signIn(ADMIN);
    const error = await staffApi.list().catch((caught: unknown) => caught);
    expect(isForbidden(error)).toBe(true);
  });

  it('lets the Owner manage the catalog, which §3.2 allows', async () => {
    await signIn(OWNER);

    const category = await categoriesApi.create({ name: 'Kategori Owner' });
    expect(category.isActive).toBe(true);
  });

  it('closes transactions to the Admin entirely', async () => {
    await signIn(ADMIN);
    const error = await transactionsApi.list().catch((caught: unknown) => caught);
    expect(isForbidden(error)).toBe(true);
  });

  it('closes the business dashboard to the Admin', async () => {
    await signIn(ADMIN);
    const error = await dashboardApi.summary(PERIOD).catch((caught: unknown) => caught);
    expect(isForbidden(error)).toBe(true);
  });

  it('keeps insight to the Owner', async () => {
    await signIn(ADMIN);
    const error = await insightsApi.get().catch((caught: unknown) => caught);
    expect(isForbidden(error)).toBe(true);
  });

  it('forces a cashier onto their own outlet in the catalogue', async () => {
    await signIn(CASHIER_A);

    const error = await catalogApi.list({ outlet_id: 'otl_b' }).catch((caught: unknown) => caught);
    expect(isForbidden(error)).toBe(true);

    const own = await catalogApi.list({ outlet_id: 'otl_a', size: 100 });
    expect(own.items.length).toBeGreaterThan(0);
  });
});

describe('the cashier catalogue', () => {
  beforeEach(() => signIn(CASHIER_A));

  it('excludes inactive products and inactive categories', async () => {
    const catalog = await catalogApi.list({ outlet_id: 'otl_a', size: 100 });
    const ids = catalog.items.map((item) => item.productId);

    // prd_old01 is deactivated; prd_rk016 sits in an inactive category.
    expect(ids).not.toContain('prd_old01');
    expect(ids).not.toContain('prd_rk016');
  });

  it('carries the outlet stock the cart needs as a ceiling', async () => {
    const catalog = await catalogApi.list({ outlet_id: 'otl_a', size: 100 });
    const cola = catalog.items.find((item) => item.productId === 'prd_cc1500');

    expect(cola?.stockQuantity).toBe(5);
    expect(cola?.price).toBe(15000);
  });
});

describe('per-outlet price overrides', () => {
  it('prices the catalog and checkout from the override, then restores the master price', async () => {
    await signIn(ADMIN);
    const override = await productsApi.setOutletPrice('prd_cc1500', 'otl_a', {
      price: '17250.00',
    });
    expect(override.price).toBe(17250);

    await signIn(CASHIER_A);
    const overriddenCatalog = await catalogApi.list({ outlet_id: 'otl_a', size: 100 });
    expect(overriddenCatalog.items.find((item) => item.productId === 'prd_cc1500')?.price).toBe(
      17250
    );

    const sale = await transactionsApi.checkout({
      checkout_request_id: mintCheckoutRequestId(),
      outlet_id: 'otl_a',
      payment_method: 'CASH',
      items: [{ product_id: 'prd_cc1500', quantity: 1, expected_unit_price: '17250.00' }],
    });
    expect(sale.items[0]?.unitPrice).toBe(17250);

    await signIn(ADMIN);
    await expect(productsApi.removeOutletPrice('prd_cc1500', 'otl_a')).resolves.toBeNull();

    await signIn(CASHIER_A);
    const fallbackCatalog = await catalogApi.list({ outlet_id: 'otl_a', size: 100 });
    expect(fallbackCatalog.items.find((item) => item.productId === 'prd_cc1500')?.price).toBe(
      15000
    );
  });
});

describe('platform health', () => {
  it('returns the contract health shape without requiring a session', async () => {
    await expect(healthApi.get()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
      workerBacklog: { aiJobPending: 0 },
    });
  });
});

describe('the error cases the UI has to design for', () => {
  it('409s on a duplicate email, naming the field', async () => {
    await signIn(OWNER);

    const error = await staffApi
      .create({
        name: 'Duplicate',
        email: 'budi@indomart.com',
        password: 'password123',
        role: 'ADMIN',
      })
      .catch((caught: unknown) => caught);

    expect(isDuplicateEmail(error)).toBe(true);
  });

  it('400s when a cashier is created without an outlet', async () => {
    await signIn(OWNER);

    const error = await failing(
      staffApi.create({
        name: 'Kasir',
        email: 'kasir@indomart.com',
        password: 'password123',
        role: 'CASHIER',
      })
    );

    expect(error.kind).toBe('validation');
  });

  it('400s when an admin is created with one', async () => {
    await signIn(OWNER);

    const error = await failing(
      staffApi.create({
        name: 'Admin',
        email: 'admin2@indomart.com',
        password: 'password123',
        role: 'ADMIN',
        outlet_id: 'otl_a',
      })
    );

    expect(error.kind).toBe('validation');
  });

  it('409s with the shortfall when the basket exceeds stock', async () => {
    await signIn(CASHIER_A);

    const error = await failing(
      transactionsApi.checkout(checkoutInput([{ product_id: 'prd_cc1500', quantity: 99 }]))
    );

    expect(isInsufficientStock(error)).toBe(true);
    expect(insufficientStockDetails(error)[0]).toMatchObject({ itemIndex: 0, available: 5 });
  });

  it('409s with PRICE_CHANGED when the expected price is stale', async () => {
    await signIn(CASHIER_A);

    const error = await transactionsApi
      .checkout({
        ...checkoutInput([{ product_id: 'prd_cc1500', quantity: 1 }]),
        items: [{ product_id: 'prd_cc1500', quantity: 1, expected_unit_price: '9000.00' }],
      })
      .catch((caught: unknown) => caught);

    expect(isPriceChanged(error)).toBe(true);
    expect(priceChangedDetails(error)[0]?.currentPrice).toBe(15000);
  });

  it('409s when the product has been deactivated under the basket', async () => {
    await signIn(ADMIN);
    await productsApi.deactivate('prd_cc1500');

    await signIn(CASHIER_A);
    const error = await transactionsApi
      .checkout(checkoutInput([{ product_id: 'prd_cc1500', quantity: 1 }]))
      .catch((caught: unknown) => caught);

    expect(conflictCondition(error)).toBe('PRODUCT_INACTIVE');
  });

  it('times out when the server stops answering', async () => {
    await signIn(OWNER);
    setMockScenario('timeout');

    // A short deadline, so the assertion is about the timeout path rather than
    // about how long the suite is willing to wait.
    const error = await failing(
      request({ method: 'GET', path: '/products', schema: z.unknown(), timeoutMs: 20 })
    );

    expect(error.kind).toBe('timeout');
  });
});

describe('checkout', () => {
  beforeEach(() => signIn(CASHIER_A));

  it('creates a sale and moves stock', async () => {
    const before = await catalogApi.list({ outlet_id: 'otl_a', size: 100 });
    const stockBefore =
      before.items.find((item) => item.productId === 'prd_ks250')?.stockQuantity ?? 0;

    const sale = await transactionsApi.checkout(
      checkoutInput([{ product_id: 'prd_ks250', quantity: 2 }])
    );

    expect(sale.status).toBe('COMPLETED');
    expect(sale.items).toHaveLength(1);
    expect(sale.operator.role).toBe('CASHIER');

    const after = await catalogApi.list({ outlet_id: 'otl_a', size: 100 });
    const stockAfter =
      after.items.find((item) => item.productId === 'prd_ks250')?.stockQuantity ?? 0;

    expect(stockAfter).toBe(stockBefore - 2);
  });

  it('keeps total equal to subtotal — there is nothing else to add', async () => {
    const sale = await transactionsApi.checkout(
      checkoutInput([
        { product_id: 'prd_ks250', quantity: 2 },
        { product_id: 'prd_or133', quantity: 1 },
      ])
    );

    expect(sale.total).toBe(sale.subtotal);
    expect(sale.total).toBe(18000 * 2 + 10000);
  });

  it('snapshots the product name onto the line', async () => {
    const sale = await transactionsApi.checkout(
      checkoutInput([{ product_id: 'prd_ks250', quantity: 1 }])
    );

    expect(sale.items[0]?.name).toBe('Kopi Susu Botol 250ml');
  });

  it('returns the existing sale when the same request is repeated', async () => {
    const input = checkoutInput([{ product_id: 'prd_ks250', quantity: 1 }]);

    const first = await transactionsApi.checkout(input);
    const replay = await transactionsApi.checkout(input);

    expect(replay.transactionId).toBe(first.transactionId);
  });

  it('does not decrement stock twice on a replay', async () => {
    const input = checkoutInput([{ product_id: 'prd_ks250', quantity: 1 }]);

    await transactionsApi.checkout(input);
    await transactionsApi.checkout(input);

    const catalog = await catalogApi.list({ outlet_id: 'otl_a', size: 100 });
    const stock = catalog.items.find((item) => item.productId === 'prd_ks250')?.stockQuantity;

    // Seeded at 12; exactly one unit sold.
    expect(stock).toBe(11);
  });

  it('409s when one request id carries two different payloads', async () => {
    const id = mintCheckoutRequestId();

    await transactionsApi.checkout({
      ...checkoutInput([{ product_id: 'prd_ks250', quantity: 1 }]),
      checkout_request_id: id,
    });

    const error = await transactionsApi
      .checkout({
        ...checkoutInput([{ product_id: 'prd_ks250', quantity: 2 }]),
        checkout_request_id: id,
      })
      .catch((caught: unknown) => caught);

    expect(conflictCondition(error)).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('refuses to oversell, leaving stock untouched', async () => {
    await transactionsApi
      .checkout(checkoutInput([{ product_id: 'prd_cc1500', quantity: 99 }]))
      .catch(() => null);

    const catalog = await catalogApi.list({ outlet_id: 'otl_a', size: 100 });
    const stock = catalog.items.find((item) => item.productId === 'prd_cc1500')?.stockQuantity;

    expect(stock).toBe(5);
  });

  it('records a confirmed payment with a method', async () => {
    const sale = await transactionsApi.checkout({
      ...checkoutInput([{ product_id: 'prd_ks250', quantity: 1 }]),
      payment_method: 'QRIS',
    });

    expect(sale.payment.method).toBe('QRIS');
    expect(sale.payment.status).toBe('CONFIRMED');
  });

  it('can be recovered by its request id after a dropped response', async () => {
    const input = checkoutInput([{ product_id: 'prd_ks250', quantity: 1 }]);
    const sale = await transactionsApi.checkout(input);

    const found = await transactionsApi.statusFor(input.checkout_request_id);
    expect(found.transactionId).toBe(sale.transactionId);
  });

  it('404s for a request id that never landed', async () => {
    const error = await failing(transactionsApi.statusFor(mintCheckoutRequestId()));

    expect(error.kind).toBe('not_found');
  });
});

describe('transactions', () => {
  it('shows a cashier only their own sales', async () => {
    await signIn(CASHIER_A);
    const mine = await transactionsApi.list({ size: 100 });

    expect(mine.items.length).toBeGreaterThan(0);
    for (const row of mine.items) expect(row.operatorName).toBe('Budi Santoso');
  });

  it('shows two cashiers at one outlet different lists', async () => {
    await signIn(CASHIER_A);
    const budi = await transactionsApi.list({ size: 100 });

    await signIn(CASHIER_B);
    const rudi = await transactionsApi.list({ size: 100 });

    const overlap = budi.items.filter((row) =>
      rudi.items.some((other) => other.transactionId === row.transactionId)
    );
    expect(overlap).toHaveLength(0);
  });

  it('shows the Owner every outlet that has sales', async () => {
    await signIn(OWNER);
    const all = await transactionsApi.list({ size: 100 });

    const outlets = new Set(all.items.map((row) => row.outletId));
    expect(outlets.size).toBeGreaterThan(1);
  });

  it('finds a sale by its exact number and nothing less', async () => {
    await signIn(OWNER);
    const all = await transactionsApi.list({ size: 100 });
    const target = all.items[0]!;

    const found = await transactionsApi.search(target.transactionNumber);
    expect(found.transactionId).toBe(target.transactionId);

    // §5.2 is an exact match: a prefix finds nothing.
    const error = await failing(transactionsApi.search(target.transactionNumber.slice(0, 8)));
    expect(error.kind).toBe('not_found');
  });

  it('filters by date range', async () => {
    await signIn(OWNER);

    const narrow = await transactionsApi.list({
      date_from: '2026-08-13T00:00:00+07:00',
      date_to: '2026-08-13T23:59:59+07:00',
      size: 100,
    });

    const from = Date.parse('2026-08-13T00:00:00+07:00');
    const to = Date.parse('2026-08-13T23:59:59+07:00');

    expect(narrow.total).toBeGreaterThan(0);
    // Compared as instants, not as strings: the range carries a +07:00 offset
    // and the timestamps are stored in UTC, so a sale at 01:40 local reads as
    // the previous calendar day in its own text.
    for (const row of narrow.items) {
      const at = Date.parse(row.createdAt);
      expect(at).toBeGreaterThanOrEqual(from);
      expect(at).toBeLessThanOrEqual(to);
    }
  });

  it('serves a printable receipt with the header fields only it carries', async () => {
    await signIn(OWNER);
    const all = await transactionsApi.list({ size: 100 });

    const receipt = await transactionsApi.receipt(all.items[0]!.transactionId);

    expect(receipt.merchantName).toBe('IndoMart Retail');
    expect(receipt.outletName).not.toBe('');
    expect(receipt.items.length).toBeGreaterThan(0);
  });
});

describe('stock adjustment', () => {
  beforeEach(() => signIn(ADMIN));

  it('applies a signed delta and reports both sides of the move', async () => {
    const result = await inventoryApi.adjust({
      outlet_id: 'otl_a',
      product_id: 'prd_cc1500',
      delta: 7,
      reason: 'Restock dari supplier',
    });

    expect(result.quantityBefore).toBe(5);
    expect(result.quantityAfter).toBe(12);
  });

  it('rejects a zero delta and a missing reason', async () => {
    const zero = await failing(
      inventoryApi.adjust({ outlet_id: 'otl_a', product_id: 'prd_cc1500', delta: 0, reason: 'x' })
    );
    expect(zero.kind).toBe('validation');

    const noReason = await failing(
      inventoryApi.adjust({ outlet_id: 'otl_a', product_id: 'prd_cc1500', delta: 1, reason: '  ' })
    );
    expect(noReason.kind).toBe('validation');
  });

  it('refuses to go negative, and writes nothing when it would', async () => {
    const error = await failing(
      inventoryApi.adjust({
        outlet_id: 'otl_a',
        product_id: 'prd_cc1500',
        delta: -99,
        reason: 'Rusak',
      })
    );

    expect(error.kind).toBe('conflict');

    const rows = await inventoryApi.list({ outlet_id: 'otl_a', product_id: 'prd_cc1500' });
    expect(rows.items[0]?.quantity).toBe(5);
  });

  it('writes a movement the ledger can show', async () => {
    await inventoryApi.adjust({
      outlet_id: 'otl_a',
      product_id: 'prd_cc1500',
      delta: 3,
      reason: 'Stock opname',
    });

    const movements = await inventoryApi.movements({ product_id: 'prd_cc1500' });

    expect(movements.items[0]?.type).toBe('ADJUSTMENT');
    expect(movements.items[0]?.reason).toBe('Stock opname');
  });
});

describe('insight', () => {
  beforeEach(() => signIn(OWNER));

  it('returns the latest job and one result per type', async () => {
    const response = await insightsApi.get();

    expect(response.analysisJob.status).toBe('READY');
    expect(response.insights.length).toBeGreaterThan(0);
    expect(new Set(response.insights.map((insight) => insight.type)).size).toBe(
      response.insights.length
    );
  });

  it('queues a job on the first trigger of the day and reuses it after', async () => {
    const first = await insightsApi.trigger();
    const second = await insightsApi.trigger();

    expect(second.jobId).toBe(first.jobId);
    // §7.2: the second call is a 200, not a second 202.
    expect(second.isNewJob).toBe(false);
  });
});
