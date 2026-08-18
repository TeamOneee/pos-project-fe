/**
 * Boundary behaviour, exercised against a stub transport rather than the mock.
 *
 * That is the point: these are the same domain clients the app uses in mock
 * mode, fed hand-written contract payloads. If they behave identically here,
 * nothing above the transport depends on which mode is active.
 *
 * Everything below is shaped by docs/07-iterasi-1-api-contract.md — §0 for the
 * envelopes, pagination and money, §0.1 for the error conditions, §5.2 for
 * checkout.
 */

import { z } from 'zod';

import { request, setTransport } from '@/api/client';
import { dashboardApi } from '@/services/dashboard';
import { productsApi } from '@/services/products';
import { staffApi } from '@/services/staff';
import { transactionsApi } from '@/services/transactions';
import {
  ApiError,
  conflictCondition,
  fieldErrors,
  insufficientStockDetails,
  isDuplicateEmail,
  isInsufficientStock,
  isPriceChanged,
  isRateLimited,
  isUnauthorized,
  priceChangedDetails,
} from '@/api/errors';
import type { ApiRawResponse, Transport } from '@/api/transport';

/** Wrap a payload the way §0's success envelope does. */
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

/** §0: `content` / zero-based `page` / `size` / `total_elements` / `total_pages`. */
function pageOf(content: unknown[], overrides: Record<string, number> = {}) {
  return {
    content,
    page: 0,
    size: 20,
    total_elements: content.length,
    total_pages: 1,
    ...overrides,
  };
}

afterEach(() => setTransport(null));

/** §3.4 `ProductDto`. Note what is absent: there is no `sku` in this contract. */
const PRODUCT_PAYLOAD = {
  id: 'prd_1',
  merchant_id: 'mrc_1',
  category_id: 'cat_1',
  category_name: 'Beverages',
  name: 'Coca Cola 1.5L',
  price: '15000.00',
  low_stock_threshold: 10,
  is_active: true,
  created_at: '2026-08-13T14:30:00.000Z',
  updated_at: '2026-08-13T14:30:00.000Z',
};

const PERIOD = { date_from: '2026-08-01T00:00:00+07:00', date_to: '2026-08-13T23:59:59+07:00' };

const META = {
  data_updated_at: '2026-08-13T09:55:00+07:00',
  freshness_status: 'FRESH',
  timezone: 'Asia/Jakarta',
  period_start: PERIOD.date_from,
  period_end: PERIOD.date_to,
};

describe('money is parsed to integer rupiah at the boundary', () => {
  it('turns the API decimal string into an exact integer', async () => {
    setTransport(stub(envelope(pageOf([PRODUCT_PAYLOAD]))));

    const page = await productsApi.list();

    expect(page.items[0]?.price).toBe(15000);
    expect(typeof page.items[0]?.price).toBe('number');
  });

  it('never lets a decimal string through to the caller', async () => {
    setTransport(stub(envelope(pageOf([{ ...PRODUCT_PAYLOAD, price: '1250750.00' }]))));

    const page = await productsApi.list();

    expect(page.items[0]?.price).toBe(1250750);
  });

  it('parses every money field of the dashboard summary', async () => {
    setTransport(
      stub(
        envelope({
          omzet: '4500000.00',
          transaction_count: 128,
          average_transaction_value: '35156.00',
          ...META,
        })
      )
    );

    const summary = await dashboardApi.summary(PERIOD);

    expect(summary.omzet).toBe(4500000);
    expect(summary.averageTransactionValue).toBe(35156);
    expect(summary.transactionCount).toBe(128);
  });

  it('fails loudly on a fractional rupiah rather than rounding it', async () => {
    setTransport(stub(envelope(pageOf([{ ...PRODUCT_PAYLOAD, price: '15000.50' }]))));

    await expect(productsApi.list()).rejects.toMatchObject({ kind: 'parse' });
  });

  it('lifts the inline dashboard meta into one object', async () => {
    setTransport(
      stub(
        envelope({
          omzet: '0.00',
          transaction_count: 0,
          average_transaction_value: '0.00',
          ...META,
          freshness_status: 'STALE',
        })
      )
    );

    const summary = await dashboardApi.summary(PERIOD);

    // §6.1: a STALE read is still a 200 carrying the last aggregate.
    expect(summary.meta.freshness).toBe('STALE');
    expect(summary.meta.timezone).toBe('Asia/Jakarta');
    expect(summary.meta.periodStart).toBe(PERIOD.date_from);
  });
});

describe('a malformed payload fails at the boundary', () => {
  it('rejects a response missing a required field', async () => {
    const withoutPrice: Record<string, unknown> = { ...PRODUCT_PAYLOAD };
    delete withoutPrice.price;
    setTransport(stub(envelope(pageOf([withoutPrice]))));

    await expect(productsApi.list()).rejects.toMatchObject({ kind: 'parse' });
  });

  it('rejects a field of the wrong type instead of rendering undefined', async () => {
    setTransport(stub(envelope(pageOf([{ ...PRODUCT_PAYLOAD, low_stock_threshold: 'ten' }]))));

    await expect(productsApi.list()).rejects.toMatchObject({ kind: 'parse' });
  });

  it('rejects a body that is not an envelope at all', async () => {
    setTransport(stub({ status: 200, body: [PRODUCT_PAYLOAD] }));

    await expect(productsApi.list()).rejects.toMatchObject({ kind: 'parse' });
  });

  it('rejects the old page shape, so a stale backend cannot go unnoticed', async () => {
    setTransport(
      stub(envelope({ items: [PRODUCT_PAYLOAD], total: 1, page: 1, limit: 20, total_pages: 1 }))
    );

    await expect(productsApi.list()).rejects.toMatchObject({ kind: 'parse' });
  });
});

describe('204 responses', () => {
  it('reads a no-content success rather than failing on the missing envelope', async () => {
    setTransport(stub({ status: 204, body: null }));

    const result = await request({
      method: 'DELETE',
      path: '/inventory/prd_1/outlets/otl_a/low-stock-threshold',
      schema: z.null(),
    });

    expect(result).toBeNull();
  });
});

describe('error envelopes become typed ApiErrors', () => {
  it('maps 401 to unauthorized', async () => {
    setTransport(stub(failure(401, 'Autentikasi gagal')));

    const error = await productsApi.list().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(isUnauthorized(error)).toBe(true);
  });

  it('maps 429 to rate limited', async () => {
    setTransport(stub(failure(429, 'Terlalu banyak permintaan')));

    const error = await productsApi.list().catch((caught: unknown) => caught);

    expect(isRateLimited(error)).toBe(true);
  });

  it('exposes field errors for a form to consume', async () => {
    setTransport(
      stub(
        failure(400, 'Validasi gagal', [
          { field: 'name', message: 'Name should not be empty' },
          { field: 'low_stock_threshold', message: 'must not be negative' },
        ])
      )
    );

    const error = await productsApi
      .create({ name: '', price: '0.00', category_id: 'cat_1', low_stock_threshold: -1 })
      .catch((caught: unknown) => caught);

    expect(fieldErrors(error)).toEqual([
      { field: 'name', message: 'Name should not be empty' },
      { field: 'low_stock_threshold', message: 'must not be negative' },
    ]);
  });

  it('recognises a duplicate email from the 409 template', async () => {
    setTransport(stub(failure(409, 'Email sudah terdaftar')));

    const error = await staffApi
      .create({ name: 'Sari', email: 'sari@indomart.com', password: 'InitPass1!', role: 'ADMIN' })
      .catch((caught: unknown) => caught);

    expect(isDuplicateEmail(error)).toBe(true);
    expect(conflictCondition(error)).toBe('EMAIL_ALREADY_REGISTERED');
  });
});

describe('checkout conflicts (§5.2)', () => {
  const INPUT = {
    checkout_request_id: 'a3f5c9d2-1e4b-4a2c-9f21-000000000001',
    outlet_id: 'otl_a',
    payment_method: 'CASH' as const,
    items: [{ product_id: 'prd_1', quantity: 2 }],
  };

  it('reads the shortfall out of an insufficient-stock 409', async () => {
    setTransport(
      stub(
        failure(409, 'Stok tidak mencukupi', [
          { field: 'items[1].product_id', message: 'stock=0, requested=1' },
        ])
      )
    );

    const error = await transactionsApi.checkout(INPUT).catch((caught: unknown) => caught);

    expect(isInsufficientStock(error)).toBe(true);
    expect(insufficientStockDetails(error)).toEqual([
      { field: 'items[1].product_id', itemIndex: 1, available: 0, requested: 1 },
    ]);
  });

  it('parses the new price out of a price-changed 409 as integer rupiah', async () => {
    setTransport(
      stub(
        failure(409, 'Harga produk berubah', [
          { field: 'items[0].product_id', message: 'current_price=9000.00' },
        ])
      )
    );

    const error = await transactionsApi.checkout(INPUT).catch((caught: unknown) => caught);

    expect(isPriceChanged(error)).toBe(true);
    expect(priceChangedDetails(error)).toEqual([
      { field: 'items[0].product_id', itemIndex: 0, currentPrice: 9000 },
    ]);
  });

  it('separates the named 409s that share a status code', async () => {
    setTransport(stub(failure(409, 'Kategori produk tidak aktif')));
    let error = await transactionsApi.checkout(INPUT).catch((caught: unknown) => caught);
    expect(conflictCondition(error)).toBe('CATEGORY_INACTIVE');

    setTransport(stub(failure(409, 'Konflik idempotency checkout')));
    error = await transactionsApi.checkout(INPUT).catch((caught: unknown) => caught);
    expect(conflictCondition(error)).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('puts the request id in the body, not in a header', async () => {
    const seen: unknown[] = [];
    setTransport((sent) => {
      seen.push(sent.body);
      return Promise.resolve(
        envelope({
          transaction_id: 'trx_1',
          transaction_number: 'TRX-20260813-001',
          status: 'COMPLETED',
          outlet_id: 'otl_a',
          operator: { user_id: 'usr_1', role: 'CASHIER', name: 'Budi' },
          items: [],
          subtotal: '0.00',
          total: '0.00',
          payment: {
            method: 'CASH',
            status: 'CONFIRMED',
            paid_at: '2026-08-13T14:30:00+07:00',
          },
          created_at: '2026-08-13T14:30:00+07:00',
        })
      );
    });

    await transactionsApi.checkout(INPUT);

    expect(seen[0]).toMatchObject({ checkout_request_id: INPUT.checkout_request_id });
  });
});

describe('timeouts', () => {
  it('aborts and reports a timeout when the server never answers', async () => {
    setTransport(
      (sent) =>
        new Promise((_resolve, reject) => {
          sent.signal?.addEventListener('abort', () => {
            const abort = new Error('aborted');
            abort.name = 'AbortError';
            reject(abort);
          });
        })
    );

    const error = await request({
      method: 'GET',
      path: '/products',
      schema: z.unknown(),
      timeoutMs: 10,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('timeout');
  });
});

describe('pagination', () => {
  it('normalises the contract page block', async () => {
    setTransport(
      stub(
        envelope(
          pageOf([PRODUCT_PAYLOAD], { page: 2, size: 20, total_elements: 134, total_pages: 7 })
        )
      )
    );

    const page = await productsApi.list({ page: 2, size: 20 });

    expect(page.items).toHaveLength(1);
    expect(page.page).toBe(2);
    expect(page.size).toBe(20);
    expect(page.total).toBe(134);
    expect(page.totalPages).toBe(7);
  });
});
