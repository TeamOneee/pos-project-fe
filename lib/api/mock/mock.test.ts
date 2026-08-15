/**
 * The mock adapter, driven through the real domain clients.
 *
 * Nothing here reaches into the in-memory store directly — every assertion goes
 * through the same call a screen would make, so what is verified is the data
 * the screens will actually receive.
 */

import { z } from 'zod';

import { request, setTransport } from '@/lib/api/client';
import { aiInsightsApi } from '@/lib/api/domains/ai-insights';
import { authApi } from '@/lib/api/domains/auth';
import { cartApi } from '@/lib/api/domains/cart';
import { categoriesApi } from '@/lib/api/domains/categories';
import { dashboardApi } from '@/lib/api/domains/dashboard';
import { inventoryApi } from '@/lib/api/domains/inventory';
import { outletsApi } from '@/lib/api/domains/outlets';
import { productsApi } from '@/lib/api/domains/products';
import { transactionsApi } from '@/lib/api/domains/transactions';
import { usersApi } from '@/lib/api/domains/users';
import {
  insufficientStockDetails,
  isDuplicateEmail,
  isForbidden,
  isPriceChanged,
  isUnauthorized,
  priceChangedDetails,
  type ApiError,
} from '@/lib/api/errors';
import { mockTransport } from '@/lib/api/mock/adapter';
import { resetDb } from '@/lib/api/mock/db';
import { clearMockScenario, setMockScenario } from '@/lib/api/mock/scenarios';

const OWNER = { email: 'owner@indomart.com', password: 'SecurePassword123!' };
const ADMIN = { email: 'ani@example.com', password: 'password123' };
const CASHIER_A = { email: 'budi@example.com', password: 'password123' };

beforeEach(() => {
  resetDb();
  clearMockScenario();
  setTransport(mockTransport);
});

afterAll(() => setTransport(null));

const signIn = (credentials: { email: string; password: string }) => authApi.login(credentials);

/* -------------------------------------------------------------------------- */

describe('the seeded dataset', () => {
  beforeEach(() => signIn(OWNER));

  it('is IndoMart Retail with three outlets, five users, eight categories', async () => {
    const [outlets, users, categories] = await Promise.all([
      outletsApi.list(),
      usersApi.list(),
      categoriesApi.list(),
    ]);

    expect(outlets).toHaveLength(3);
    expect(users).toHaveLength(5);
    expect(categories).toHaveLength(8);
    expect(outlets.map((outlet) => outlet.name)).toContain('Outlet A - Mall Central');
  });

  it('has twelve products, priced in integer rupiah', async () => {
    const products = await productsApi.list({ limit: 50 });

    expect(products.total).toBe(12);
    expect(products.items.every((product) => Number.isInteger(product.price))).toBe(true);

    const cola = products.items.find((product) => product.sku === 'CC-1500');
    expect(cola?.name).toBe('Coca Cola 1.5L');
    expect(cola?.price).toBe(15000);
  });

  it('serves the fields the backend is still missing', async () => {
    const products = await productsApi.list({ limit: 50 });
    const categories = await categoriesApi.list();

    // Product.sku and Category.status are both known backend gaps.
    expect(products.items.every((product) => product.sku.length > 0)).toBe(true);
    expect(categories.every((category) => category.status === 'ACTIVE')).toBe(true);
  });

  it('gives one cashier per outlet plus an owner and an admin', async () => {
    const users = await usersApi.list();
    const roles = users.map((user) => user.role).sort();

    expect(roles).toEqual(['ADMIN', 'CASHIER', 'CASHIER', 'CASHIER', 'OWNER']);
    // A cashier is always bound to an outlet; admin and owner never are.
    expect(users.filter((user) => user.role === 'CASHIER').every((user) => user.outletId)).toBe(
      true
    );
    expect(users.find((user) => user.role === 'ADMIN')?.outletId).toBeNull();
  });
});

describe('stock levels', () => {
  it('produces eight low-stock and three out-of-stock rows', async () => {
    await signIn(ADMIN);
    const dashboard = await dashboardApi.admin();

    expect(dashboard.summary.lowStockProductsCount).toBe(8);
    expect(dashboard.summary.outOfStockProductsCount).toBe(3);
    expect(dashboard.lowStockAlerts).toHaveLength(8);
    expect(dashboard.outOfStockAlerts).toHaveLength(3);
  });

  it('matches the figures the contract quotes', async () => {
    await signIn(ADMIN);
    const alerts = await inventoryApi.lowStock('otl_a');

    const cola = alerts.find((alert) => alert.sku === 'CC-1500');
    expect(cola?.currentStock).toBe(5);
    expect(cola?.threshold).toBe(10);
    expect(cola?.outletName).toBe('Outlet A - Mall Central');
  });

  it('values stock in integer rupiah computed from live quantities', async () => {
    await signIn(ADMIN);
    const before = await dashboardApi.admin();

    const inventory = await inventoryApi.list({ outlet_id: 'otl_a', limit: 50 });
    const cola = inventory.items.find((item) => item.product?.sku === 'CC-1500');

    await inventoryApi.adjust(cola?.inventoryId ?? '', {
      quantity: 105,
      reason: 'Restock from supplier',
    });

    const after = await dashboardApi.admin();

    // 100 more units at 15.000 each.
    expect(after.summary.totalStockValue - before.summary.totalStockValue).toBe(1_500_000);
    expect(Number.isInteger(after.summary.totalStockValue)).toBe(true);
  });
});

describe('the Owner dashboard', () => {
  beforeEach(() => signIn(OWNER));

  it('arrives complete in a single response', async () => {
    const dashboard = await dashboardApi.owner();

    expect(dashboard.summary.totalRevenue).toBe(15_750_000);
    expect(dashboard.summary.totalTransactions).toBe(1250);
    expect(dashboard.summary.averageOrderValue).toBe(12_600);
    expect(dashboard.summary.revenueGrowth).toBe(12.5);
    expect(dashboard.summary.transactionsGrowth).toBe(8.3);
    expect(dashboard.salesTrend.labels).toHaveLength(7);
    expect(dashboard.outletPerformance).toHaveLength(3);
    expect(dashboard.topProducts.byRevenue.length).toBeGreaterThan(0);
    expect(dashboard.underperformingProducts.length).toBeGreaterThan(0);
    expect(dashboard.recentTransactions.length).toBeGreaterThan(0);
    expect(dashboard.periodComparison.currentPeriod.totalRevenue).toBe(15_750_000);
  });

  it('agrees with the entity screens on every count', async () => {
    const dashboard = await dashboardApi.owner();

    expect(dashboard.summary.totalOutlets).toBe(3);
    expect(dashboard.summary.totalEmployees).toBe(5);
    expect(dashboard.merchantOverview.totalCategories).toBe(8);
    expect(dashboard.merchantOverview.merchantName).toBe('IndoMart Retail');
  });

  it('splits revenue across outlets so the parts sum to the whole', async () => {
    const dashboard = await dashboardApi.owner();

    const total = dashboard.outletPerformance.reduce(
      (sum, outlet) => sum + outlet.totalRevenue,
      0
    );
    const transactions = dashboard.outletPerformance.reduce(
      (sum, outlet) => sum + outlet.totalTransactions,
      0
    );

    expect(total).toBe(dashboard.summary.totalRevenue);
    expect(transactions).toBe(dashboard.summary.totalTransactions);
  });

  it('emits no decimal strings anywhere in the payload', async () => {
    const dashboard = await dashboardApi.owner();

    expect(JSON.stringify(dashboard)).not.toMatch(/"\d+\.\d\d"/);
  });

  it('sums the daily trend to the period revenue', async () => {
    const dashboard = await dashboardApi.owner();

    const summed = dashboard.salesTrend.revenue.reduce((sum, value) => sum + value, 0);
    expect(summed).toBe(15_750_000);
  });
});

describe('authentication and role gating', () => {
  it('rejects a bad password with 401', async () => {
    const error = await signIn({ email: OWNER.email, password: 'wrong' }).catch(
      (caught: unknown) => caught
    );

    expect(isUnauthorized(error)).toBe(true);
  });

  it('rejects an unknown email with 401', async () => {
    const error = await signIn({ email: 'nobody@example.com', password: 'x' }).catch(
      (caught: unknown) => caught
    );

    expect(isUnauthorized(error)).toBe(true);
  });

  it('answers 401 when there is no session at all', async () => {
    const error = await outletsApi.list().catch((caught: unknown) => caught);

    expect(isUnauthorized(error)).toBe(true);
  });

  it('keeps staff management to the Owner', async () => {
    await signIn(CASHIER_A);
    const error = await usersApi.list().catch((caught: unknown) => caught);

    expect(isForbidden(error)).toBe(true);
  });

  it('keeps the Owner read-only on the catalog', async () => {
    await signIn(OWNER);
    const error = await productsApi
      .create({ name: 'X', sku: 'X-1', price: '1000.00', category_id: 'cat_beverages' })
      .catch((caught: unknown) => caught);

    // The role matrix makes catalog writes Admin-only, stricter than the contract.
    expect(isForbidden(error)).toBe(true);
  });

  it('keeps the Owner read-only on inventory', async () => {
    await signIn(OWNER);
    const error = await inventoryApi
      .adjust('inv_otl_a_prd_cc1500', { quantity: 20, reason: 'test' })
      .catch((caught: unknown) => caught);

    expect(isForbidden(error)).toBe(true);
  });

  it('closes transactions to the Admin entirely', async () => {
    await signIn(ADMIN);
    const error = await transactionsApi.list().catch((caught: unknown) => caught);

    expect(isForbidden(error)).toBe(true);
  });

  it('limits a cashier to their own outlet', async () => {
    await signIn(CASHIER_A);
    const error = await inventoryApi
      .list({ outlet_id: 'otl_b' })
      .catch((caught: unknown) => caught);

    expect(isForbidden(error)).toBe(true);

    const own = await inventoryApi.list({ outlet_id: 'otl_a' });
    expect(own.items.length).toBeGreaterThan(0);
  });

  it('keeps analytics and AI to the Owner', async () => {
    await signIn(ADMIN);
    const error = await aiInsightsApi.get().catch((caught: unknown) => caught);

    expect(isForbidden(error)).toBe(true);
  });
});

describe('the error cases the UI has to design for', () => {
  it('409s on a duplicate email, naming the field', async () => {
    await signIn(OWNER);

    const error = await usersApi
      .create({
        name: 'Someone Else',
        email: 'budi@example.com',
        password: 'password123',
        role: 'CASHIER',
        outlet_id: 'otl_a',
      })
      .catch((caught: unknown) => caught);

    expect(isDuplicateEmail(error)).toBe(true);
  });

  it('400s when a cashier is created without an outlet', async () => {
    await signIn(OWNER);

    const error = await usersApi
      .create({ name: 'A', email: 'a@example.com', password: 'password123', role: 'CASHIER' })
      .catch((caught: unknown) => caught);

    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).message).toContain('outlet_id is required');
  });

  it('400s with the shortfall when the cart exceeds stock', async () => {
    await signIn(CASHIER_A);

    const error = await cartApi
      .addItem({ product_id: 'prd_cc1500', quantity: 99 })
      .catch((caught: unknown) => caught);

    expect(insufficientStockDetails(error)).toEqual([
      { productId: 'prd_cc1500', productName: 'Coca Cola 1.5L', requested: 99, available: 5 },
    ]);
  });

  it('409s with PRICE_CHANGED when a price moves under an open cart', async () => {
    await signIn(CASHIER_A);
    const cart = await cartApi.addItem({ product_id: 'prd_cc1500', quantity: 1 });

    // The Admin reprices the product while the cashier's cart is open.
    await signIn(ADMIN);
    await productsApi.update('prd_cc1500', { price: '18000.00' });

    await signIn(CASHIER_A);
    const error = await transactionsApi
      .checkout({ cart_id: cart.cartId })
      .catch((caught: unknown) => caught);

    expect(isPriceChanged(error)).toBe(true);
    expect(priceChangedDetails(error)).toEqual([
      {
        code: 'PRICE_CHANGED',
        productId: 'prd_cc1500',
        productName: 'Coca Cola 1.5L',
        cartPrice: 15000,
        currentPrice: 18000,
      },
    ]);
  });

  it('times out when the server stops answering', async () => {
    await signIn(OWNER);
    setMockScenario('timeout');

    // A short deadline rather than the 15s default, so the suite stays quick.
    const error = await request({
      method: 'GET',
      path: '/outlets',
      schema: z.unknown(),
      timeoutMs: 50,
    }).catch((caught: unknown) => caught);

    expect((error as ApiError).kind).toBe('timeout');
  });

  it('can force any error on demand, once', async () => {
    await signIn(OWNER);
    setMockScenario('server_error', { once: true });

    const failed = await outletsApi.list().catch((caught: unknown) => caught);
    expect((failed as ApiError).kind).toBe('server');

    // One-shot: the next call goes through normally.
    await expect(outletsApi.list()).resolves.toHaveLength(3);
  });

  it('answers 501 for the out-of-scope cancel endpoint', async () => {
    await signIn(CASHIER_A);

    const error = await request({
      method: 'POST',
      path: '/transactions/trx_001/cancel',
      schema: z.unknown(),
    }).catch((caught: unknown) => caught);

    expect((error as ApiError).kind).toBe('not_implemented');
  });
});

describe('checkout', () => {
  beforeEach(() => signIn(CASHIER_A));

  it('creates a sale, moves stock and empties the cart', async () => {
    await cartApi.addItem({ product_id: 'prd_cc1500', quantity: 2 });
    const cart = await cartApi.get();

    const result = await transactionsApi.checkout({ cart_id: cart.cartId });

    expect(result.isDuplicate).toBe(false);
    expect(result.transaction.total).toBe(30_000);
    expect(result.items).toHaveLength(1);
    expect(result.receipt?.receiptNumber).toMatch(/^RC-/);

    const stock = await inventoryApi.getForProduct('otl_a', 'prd_cc1500');
    expect(stock.quantity).toBe(3);

    const emptied = await cartApi.get();
    expect(emptied.items).toHaveLength(0);
  });

  it('keeps total equal to subtotal — there is nothing else to add', async () => {
    const result = await transactionsApi.checkout({
      items: [{ product_id: 'prd_cc1500', quantity: 2 }],
    });

    expect(result.transaction.total).toBe(result.transaction.subtotal);
  });

  it('returns the existing sale when the same request is repeated', async () => {
    const input = { items: [{ product_id: 'prd_cc1500', quantity: 2 }] };

    const first = await transactionsApi.checkout(input);
    const second = await transactionsApi.checkout(input);

    expect(first.isDuplicate).toBe(false);
    expect(second.isDuplicate).toBe(true);
    expect(second.transaction.transactionId).toBe(first.transaction.transactionId);
    expect(second.transaction.transactionNumber).toBe(first.transaction.transactionNumber);
  });

  it('does not charge or decrement stock twice on a replay', async () => {
    const input = { items: [{ product_id: 'prd_cc1500', quantity: 2 }] };

    await transactionsApi.checkout(input);
    await transactionsApi.checkout(input);
    await transactionsApi.checkout(input);

    // Stock moved once: 5 - 2 = 3.
    const stock = await inventoryApi.getForProduct('otl_a', 'prd_cc1500');
    expect(stock.quantity).toBe(3);

    const transactions = await transactionsApi.list({ limit: 50 });
    const created = transactions.items.filter((entry) => entry.total === 30_000);
    expect(created).toHaveLength(1);
  });

  it('treats a different payload as a different sale', async () => {
    const first = await transactionsApi.checkout({
      items: [{ product_id: 'prd_cc1500', quantity: 1 }],
    });
    const second = await transactionsApi.checkout({
      items: [{ product_id: 'prd_cc1500', quantity: 2 }],
    });

    expect(second.transaction.transactionId).not.toBe(first.transaction.transactionId);
  });

  it('refuses to oversell, leaving stock untouched', async () => {
    const error = await transactionsApi
      .checkout({ items: [{ product_id: 'prd_cc1500', quantity: 50 }] })
      .catch((caught: unknown) => caught);

    expect(insufficientStockDetails(error)[0]?.available).toBe(5);

    const stock = await inventoryApi.getForProduct('otl_a', 'prd_cc1500');
    expect(stock.quantity).toBe(5);
  });

  it('records a payment method and a status', async () => {
    const result = await transactionsApi.checkout({
      items: [{ product_id: 'prd_cc1500', quantity: 1 }],
      payment_method: 'QRIS',
    });

    // Both are backend gaps the mock fills.
    expect(result.transaction.payment?.method).toBe('QRIS');
    expect(result.transaction.status).toBe('COMPLETED');
  });
});

describe('transactions', () => {
  it('shows a cashier only their own outlet', async () => {
    await signIn(CASHIER_A);
    const transactions = await transactionsApi.list({ limit: 50 });

    expect(transactions.items.length).toBeGreaterThan(0);
    expect(transactions.items.every((entry) => entry.outletId === 'otl_a')).toBe(true);
  });

  it('shows the Owner every outlet', async () => {
    await signIn(OWNER);
    const transactions = await transactionsApi.list({ limit: 50 });

    const outlets = new Set(transactions.items.map((entry) => entry.outletId));
    expect(outlets.size).toBe(3);
  });

  it('reproduces the totals quoted in the contract', async () => {
    await signIn(OWNER);
    const detail = await transactionsApi.get('trx_001');

    expect(detail.transaction.transactionNumber).toBe('TRX-20260813-001');
    expect(detail.transaction.total).toBe(150_000);
    expect(detail.transaction.subtotal).toBe(150_000);

    const lineSum = detail.items.reduce((sum, item) => sum + item.subtotal, 0);
    expect(lineSum).toBe(detail.transaction.total);
  });

  it('filters by date range', async () => {
    await signIn(OWNER);
    const transactions = await transactionsApi.list({
      start_date: '2026-08-13',
      end_date: '2026-08-13',
      limit: 50,
    });

    expect(transactions.items.length).toBeGreaterThan(0);
    expect(
      transactions.items.every((entry) => entry.createdAt?.startsWith('2026-08-13'))
    ).toBe(true);
  });
});

describe('the cart', () => {
  beforeEach(() => signIn(CASHIER_A));

  it('is empty until something is added', async () => {
    const error = await cartApi.get().catch((caught: unknown) => caught);
    expect((error as ApiError).kind).toBe('not_found');
  });

  it('totals lines in integer rupiah', async () => {
    await cartApi.addItem({ product_id: 'prd_cc1500', quantity: 2 });
    const cart = await cartApi.addItem({ product_id: 'prd_inc001', quantity: 3 });

    // 2 x 15.000 + 3 x 3.500
    expect(cart.subtotal).toBe(40_500);
    expect(cart.totalItems).toBe(2);
    expect(cart.items.every((item) => Number.isInteger(item.unitPrice))).toBe(true);
  });

  it('clears on request', async () => {
    await cartApi.addItem({ product_id: 'prd_cc1500', quantity: 1 });
    const cleared = await cartApi.clear();

    expect(cleared.items).toHaveLength(0);
    expect(cleared.subtotal).toBe(0);
  });
});
