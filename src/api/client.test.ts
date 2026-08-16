/**
 * Boundary behaviour, exercised against a stub transport rather than the mock.
 *
 * That is the point: these are the same domain clients the app uses in mock
 * mode, fed hand-written contract payloads. If they behave identically here,
 * nothing above the transport depends on which mode is active.
 */

import { z } from 'zod';

import { request, setTransport } from '@/api/client';
import { dashboardApi } from '@/services/dashboard';
import { productsApi } from '@/services/products';
import { transactionsApi } from '@/services/transactions';
import { usersApi } from '@/services/users';
import {
  ApiError,
  fieldErrors,
  insufficientStockDetails,
  isDuplicateEmail,
  isInsufficientStock,
  isPriceChanged,
  isUnauthorized,
  priceChangedDetails,
} from '@/api/errors';
import type { ApiRawResponse, Transport } from '@/api/transport';

/** Wrap a payload the way the contract's §2 envelope does. */
function envelope(data: unknown, status = 200): ApiRawResponse {
  return { status, body: { success: true, statusCode: status, message: 'ok', data } };
}

function failure(status: number, message: string, errors: unknown = null): ApiRawResponse {
  return {
    status,
    body: { success: false, statusCode: status, path: '/test', message, errors },
  };
}

function stub(response: ApiRawResponse): Transport {
  return () => Promise.resolve(response);
}

afterEach(() => setTransport(null));

const PRODUCT_PAYLOAD = {
  product_id: 'prd_1',
  merchant_id: 'mrc_1',
  category_id: 'cat_1',
  name: 'Coca Cola 1.5L',
  sku: 'CC-1500',
  price: '15000.00',
  status: 'ACTIVE',
  created_at: '2026-08-13T14:30:00.000Z',
  updated_at: '2026-08-13T14:30:00.000Z',
  category: { category_id: 'cat_1', name: 'Beverages' },
};

describe('money is parsed to integer rupiah at the boundary', () => {
  it('turns the API decimal string into an exact integer', async () => {
    setTransport(stub(envelope(PRODUCT_PAYLOAD)));

    const product = await productsApi.get('prd_1');

    expect(product.price).toBe(15000);
    expect(typeof product.price).toBe('number');
  });

  it('never lets a decimal string through to the caller', async () => {
    setTransport(
      stub(
        envelope({
          items: [PRODUCT_PAYLOAD],
          total: 1,
          page: 1,
          limit: 10,
          total_pages: 1,
        })
      )
    );

    const result = await productsApi.list();

    expect(JSON.stringify(result)).not.toContain('15000.00');
    expect(result.items[0]?.price).toBe(15000);
  });

  it('parses every money field of the Owner dashboard', async () => {
    setTransport(stub(envelope(OWNER_DASHBOARD_PAYLOAD)));

    const dashboard = await dashboardApi.owner();

    expect(dashboard.summary.totalRevenue).toBe(15750000);
    expect(dashboard.summary.averageOrderValue).toBe(12600);
    expect(dashboard.salesTrend.revenue).toEqual([2100000, 1800000]);
    expect(dashboard.outletPerformance[0]?.totalRevenue).toBe(7250000);
    expect(dashboard.aovTrend.values.every(Number.isInteger)).toBe(true);
  });

  it('keeps percentages as floats — they are not money', async () => {
    setTransport(stub(envelope(OWNER_DASHBOARD_PAYLOAD)));

    const dashboard = await dashboardApi.owner();

    expect(dashboard.summary.revenueGrowth).toBe(12.5);
  });

  it('fails loudly on a fractional rupiah rather than rounding it', async () => {
    setTransport(stub(envelope({ ...PRODUCT_PAYLOAD, price: '15000.50' })));

    await expect(productsApi.get('prd_1')).rejects.toMatchObject({ kind: 'parse' });
  });
});

describe('a malformed payload fails at the boundary', () => {
  it('rejects a response missing a required field', async () => {
    const { name: _name, ...withoutName } = PRODUCT_PAYLOAD;
    setTransport(stub(envelope(withoutName)));

    await expect(productsApi.get('prd_1')).rejects.toBeInstanceOf(ApiError);
  });

  it('rejects a field of the wrong type instead of rendering undefined', async () => {
    setTransport(stub(envelope({ ...PRODUCT_PAYLOAD, price: { amount: 15000 } })));

    const error = await productsApi.get('prd_1').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('parse');
  });

  it('rejects a body that is not an envelope at all', async () => {
    setTransport(stub({ status: 200, body: '<html>gateway</html>' }));

    await expect(productsApi.get('prd_1')).rejects.toMatchObject({ kind: 'parse' });
  });

  it('accepts fields the backend does not send yet', async () => {
    // sku is a known backend gap: absent upstream, still present in the type.
    const { sku: _sku, ...withoutSku } = PRODUCT_PAYLOAD;
    setTransport(stub(envelope(withoutSku)));

    const product = await productsApi.get('prd_1');

    expect(product.sku).toBe('');
    expect(product.price).toBe(15000);
  });
});

describe('error envelopes become typed ApiErrors', () => {
  it('maps 401 to unauthorized', async () => {
    setTransport(stub(failure(401, 'Invalid email or password')));

    const error = await usersApi.list().catch((caught: unknown) => caught);

    expect(isUnauthorized(error)).toBe(true);
    expect((error as ApiError).message).toBe('Invalid email or password');
  });

  it.each([
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [400, 'validation'],
    [500, 'server'],
    [501, 'not_implemented'],
  ])('maps %i to %s', async (status, kind) => {
    setTransport(stub(failure(status, 'failed')));

    const error = await usersApi.list().catch((caught: unknown) => caught);

    expect((error as ApiError).kind).toBe(kind);
  });

  it('exposes field errors for a form to consume', async () => {
    setTransport(
      stub(
        failure(409, 'Email already registered', [
          { field: 'email', message: 'Email owner@indomart.com is already used' },
        ])
      )
    );

    const error = await usersApi.list().catch((caught: unknown) => caught);

    expect(isDuplicateEmail(error)).toBe(true);
    expect(fieldErrors(error)).toEqual([
      { field: 'email', message: 'Email owner@indomart.com is already used' },
    ]);
  });

  it('exposes the shortfall behind an insufficient-stock 400', async () => {
    setTransport(
      stub(
        failure(400, 'Insufficient stock for product: Coca Cola 1.5L', [
          { product_id: 'prd_1', product_name: 'Coca Cola 1.5L', requested: 5, available: 3 },
        ])
      )
    );

    const error = await transactionsApi
      .checkout({ items: [{ product_id: 'prd_1', quantity: 5 }] })
      .catch((caught: unknown) => caught);

    expect(isInsufficientStock(error)).toBe(true);
    expect(insufficientStockDetails(error)).toEqual([
      { productId: 'prd_1', productName: 'Coca Cola 1.5L', requested: 5, available: 3 },
    ]);
  });

  it('parses price-changed money into integers too', async () => {
    setTransport(
      stub(
        failure(409, 'Cart validation failed', [
          {
            code: 'PRICE_CHANGED',
            product_id: 'prd_1',
            product_name: 'Coca Cola 1.5L',
            cart_price: '15000.00',
            current_price: '18000.00',
          },
        ])
      )
    );

    const error = await transactionsApi
      .checkout({ cart_id: 'cart_1' })
      .catch((caught: unknown) => caught);

    expect(isPriceChanged(error)).toBe(true);
    expect(priceChangedDetails(error)).toEqual([
      {
        code: 'PRICE_CHANGED',
        productId: 'prd_1',
        productName: 'Coca Cola 1.5L',
        cartPrice: 15000,
        currentPrice: 18000,
      },
    ]);
  });
});

describe('timeouts', () => {
  it('aborts and reports a timeout when the server never answers', async () => {
    setTransport(
      (apiRequest) =>
        new Promise((_resolve, reject) => {
          apiRequest.signal?.addEventListener('abort', () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );

    const error = await request({
      method: 'GET',
      path: '/products',
      schema: z.unknown(),
      timeoutMs: 30,
    }).catch((caught: unknown) => caught);

    expect((error as ApiError).kind).toBe('timeout');
  });
});

describe('pagination', () => {
  it('normalises the contract page block', async () => {
    setTransport(
      stub(
        envelope({
          items: [PRODUCT_PAYLOAD],
          total: 156,
          page: 1,
          limit: 10,
          total_pages: 16,
        })
      )
    );

    const result = await productsApi.list({ page: 1 });

    expect(result.total).toBe(156);
    expect(result.totalPages).toBe(16);
  });
});

describe('checkout idempotency at the client', () => {
  it('sends a stable key derived from the payload', async () => {
    const keys: (string | undefined)[] = [];
    setTransport((apiRequest) => {
      keys.push(apiRequest.idempotencyKey);
      return Promise.resolve(envelope({ transaction: TRANSACTION_PAYLOAD }, 200));
    });

    await transactionsApi.checkout({ items: [{ product_id: 'prd_1', quantity: 2 }] });
    await transactionsApi.checkout({ items: [{ product_id: 'prd_1', quantity: 2 }] });
    await transactionsApi.checkout({ items: [{ product_id: 'prd_1', quantity: 3 }] });

    expect(keys[0]).toBeDefined();
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('flags a 200 as a replay and a 201 as a new sale', async () => {
    setTransport(stub(envelope({ transaction: TRANSACTION_PAYLOAD }, 200)));
    const replay = await transactionsApi.checkout({ cart_id: 'cart_1' });
    expect(replay.isDuplicate).toBe(true);

    setTransport(stub(envelope({ transaction: TRANSACTION_PAYLOAD, items: [] }, 201)));
    const fresh = await transactionsApi.checkout({ cart_id: 'cart_1' });
    expect(fresh.isDuplicate).toBe(false);
  });

  it('reads the abbreviated replay payload, falling back to total for subtotal', async () => {
    setTransport(stub(envelope({ transaction: TRANSACTION_PAYLOAD }, 200)));

    const result = await transactionsApi.checkout({ cart_id: 'cart_1' });

    expect(result.transaction.total).toBe(45000);
    expect(result.transaction.subtotal).toBe(45000);
    expect(result.items).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

/** The contract's idempotent-replay payload: total only, no subtotal. */
const TRANSACTION_PAYLOAD = {
  transaction_id: 'trx_1',
  transaction_number: 'TRX-20260813-002',
  total: '45000.00',
  status: 'COMPLETED',
};

const OWNER_DASHBOARD_PAYLOAD = {
  summary: {
    total_revenue: '15750000.00',
    total_transactions: 1250,
    total_orders: 1250,
    average_order_value: '12600.00',
    total_products_sold: 3420,
    total_outlets: 3,
    total_employees: 5,
    total_products: 12,
    revenue_growth: 12.5,
    transactions_growth: 8.3,
    products_sold_growth: 5.1,
  },
  sales_trend: {
    labels: ['2026-08-01', '2026-08-02'],
    datasets: { revenue: ['2100000.00', '1800000.00'], transactions: [180, 150] },
    summary: {
      highest_revenue: '2700000.00',
      lowest_revenue: '1800000.00',
      average_revenue: '2250000.00',
      total_revenue: '15750000.00',
    },
  },
  outlet_performance: [
    {
      outlet_id: 'otl_a',
      outlet_name: 'Outlet A - Mall Central',
      total_revenue: '7250000.00',
      total_transactions: 580,
      average_order_value: '12500.00',
      total_products_sold: 1520,
      contribution_percentage: 46.03,
      revenue_growth: 15.2,
    },
  ],
  top_products: { by_revenue: [], by_quantity: [] },
  underperforming_products: [],
  time_pattern: {
    hourly_distribution: [{ hour: 8, revenue: '150000.00', transaction_count: 12 }],
    peak_hours: [12, 13],
    busiest_day: 'Saturday',
    quietest_day: 'Monday',
    insights: [],
  },
  aov_trend: {
    labels: ['Week 1', 'Week 2'],
    values: ['11200.00', '11800.00'],
    current_aov: '12600.00',
    previous_aov: '11800.00',
    growth_percentage: 6.78,
  },
  recent_transactions: [],
  merchant_overview: {
    merchant_name: 'IndoMart Retail',
    total_outlets_active: 3,
    total_employees_active: 5,
    total_products_active: 12,
    total_categories: 8,
    last_ai_analysis: '2026-08-12T08:00:00.000Z',
    ai_available_today: true,
  },
  period_comparison: {
    current_period: {
      start_date: '2026-08-01',
      end_date: '2026-08-11',
      total_revenue: '15750000.00',
      total_transactions: 1250,
    },
    previous_period: {
      start_date: '2026-07-21',
      end_date: '2026-07-31',
      total_revenue: '14000000.00',
      total_transactions: 1150,
    },
    changes: { revenue_percentage: 12.5, transactions_percentage: 8.7, aov_percentage: 6.78 },
  },
};
