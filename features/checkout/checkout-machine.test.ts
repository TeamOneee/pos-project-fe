/**
 * The checkout machine, including the part that stops a customer being
 * charged twice.
 */

import {
  canConfirm,
  changeFor,
  checkoutReducer,
  classifyFailure,
  initialCheckoutState,
  isDismissable,
  isShort,
  repricedTotal,
  type CheckoutState,
} from '@/features/checkout/checkout-machine';
import type { CheckoutResult } from '@/lib/api/domains/transactions';
import { ApiError } from '@/lib/api/errors';

const TOTAL = 45_000;

const RESULT = {
  transaction: { transactionId: 'trx_1', total: TOTAL },
  items: [],
  receipt: null,
  isDuplicate: false,
} as unknown as CheckoutResult;

function state(overrides: Partial<CheckoutState> = {}): CheckoutState {
  return { ...initialCheckoutState, ...overrides };
}

describe('the duplicate-transaction guard', () => {
  it('refuses a second submit while one is in flight', () => {
    const first = checkoutReducer(state({ received: TOTAL }), {
      type: 'submit',
      idempotencyKey: 'key-1',
    });
    expect(first.status).toBe('processing');

    const second = checkoutReducer(first, { type: 'submit', idempotencyKey: 'key-2' });

    // Unchanged, and crucially not re-keyed.
    expect(second).toBe(first);
    expect(second.idempotencyKey).toBe('key-1');
  });

  it('keeps the same key across a retry, so a resend is recognised', () => {
    let current = checkoutReducer(state({ received: TOTAL }), {
      type: 'submit',
      idempotencyKey: 'key-1',
    });
    current = checkoutReducer(current, {
      type: 'reject',
      failure: { kind: 'unknown', message: 'Koneksi terputus.' },
    });

    // "Coba Lagi" — a fresh key would defeat the whole point.
    const retried = checkoutReducer(current, { type: 'submit', idempotencyKey: 'key-2' });

    expect(retried.idempotencyKey).toBe('key-1');
    expect(retried.status).toBe('processing');
  });

  it('mints a fresh key once prices change, because the request has', () => {
    let current = checkoutReducer(state({ received: TOTAL }), {
      type: 'submit',
      idempotencyKey: 'key-1',
    });
    current = checkoutReducer(current, {
      type: 'reject',
      failure: { kind: 'price_changed', items: [] },
    });
    current = checkoutReducer(current, { type: 'accept-new-prices' });

    expect(current.idempotencyKey).toBeNull();
    expect(current.payload).toBe('items');

    const resubmitted = checkoutReducer(current, { type: 'submit', idempotencyKey: 'key-2' });
    expect(resubmitted.idempotencyKey).toBe('key-2');
  });

  it('starts clean after a reset', () => {
    const current = checkoutReducer(state({ received: TOTAL, idempotencyKey: 'key-1' }), {
      type: 'reset',
    });
    expect(current).toEqual(initialCheckoutState);
  });

  it('cannot be dismissed while processing', () => {
    expect(isDismissable(state({ status: 'processing' }))).toBe(false);
    expect(isDismissable(state({ status: 'idle' }))).toBe(true);
    expect(isDismissable(state({ status: 'error' }))).toBe(true);
  });
});

describe('confirming', () => {
  it('needs enough cash on the counter', () => {
    expect(canConfirm(state({ method: 'CASH', received: null }), TOTAL)).toBe(false);
    expect(canConfirm(state({ method: 'CASH', received: 40_000 }), TOTAL)).toBe(false);
    expect(canConfirm(state({ method: 'CASH', received: TOTAL }), TOTAL)).toBe(true);
    expect(canConfirm(state({ method: 'CASH', received: 50_000 }), TOTAL)).toBe(true);
  });

  it('needs nothing for non-cash, which is recorded rather than processed', () => {
    expect(canConfirm(state({ method: 'NON_CASH' }), TOTAL)).toBe(true);
  });

  it('refuses an empty cart', () => {
    expect(canConfirm(state({ method: 'NON_CASH' }), 0)).toBe(false);
  });

  it('refuses while processing or once succeeded', () => {
    expect(canConfirm(state({ method: 'NON_CASH', status: 'processing' }), TOTAL)).toBe(false);
    expect(canConfirm(state({ method: 'NON_CASH', status: 'success' }), TOTAL)).toBe(false);
  });

  it('drops the cash amount when switching to non-cash', () => {
    const current = checkoutReducer(state({ method: 'CASH', received: 50_000 }), {
      type: 'select-method',
      method: 'NON_CASH',
    });
    expect(current.received).toBeNull();
  });
});

describe('change', () => {
  it('computes what to hand back, to the rupiah', () => {
    expect(changeFor(TOTAL, 50_000)).toBe(5_000);
    expect(changeFor(TOTAL, TOTAL)).toBe(0);
    expect(isShort(TOTAL, 50_000)).toBe(false);
  });

  it('reports a shortfall as a negative, and flags it', () => {
    expect(changeFor(TOTAL, 40_000)).toBe(-5_000);
    expect(isShort(TOTAL, 40_000)).toBe(true);
    expect(isShort(TOTAL, null)).toBe(true);
  });

  it('stays an integer', () => {
    expect(Number.isInteger(changeFor(52_500, 100_000))).toBe(true);
    expect(changeFor(52_500, 100_000)).toBe(47_500);
  });
});

describe('classifying a failure', () => {
  it('recognises insufficient stock', () => {
    const error = new ApiError({
      kind: 'validation',
      status: 400,
      message: 'Insufficient stock for product: Coca Cola 1.5L',
      details: [
        { product_id: 'p1', product_name: 'Coca Cola 1.5L', requested: 5, available: 3 },
      ],
    });

    const failure = classifyFailure(error);
    expect(failure.kind).toBe('insufficient_stock');
    expect(failure.kind === 'insufficient_stock' && failure.items[0]?.available).toBe(3);
  });

  it('recognises a price change', () => {
    const error = new ApiError({
      kind: 'conflict',
      status: 409,
      message: 'Cart validation failed',
      details: [
        {
          code: 'PRICE_CHANGED',
          product_id: 'p1',
          product_name: 'Coca Cola 1.5L',
          cart_price: '15000.00',
          current_price: '18000.00',
        },
      ],
    });

    const failure = classifyFailure(error);
    expect(failure.kind).toBe('price_changed');
    expect(failure.kind === 'price_changed' && failure.items[0]?.currentPrice).toBe(18_000);
  });

  it.each(['timeout', 'network'] as const)(
    'treats %s as unknown status, never as a failed sale',
    (kind) => {
      const failure = classifyFailure(new ApiError({ kind, status: 0, message: 'boom' }));

      expect(failure.kind).toBe('unknown');
      // The wording must not claim the sale failed — it may well have gone through.
      expect(failure.kind === 'unknown' && failure.message).toBe(
        'Koneksi terputus. Status transaksi belum diketahui.'
      );
    }
  );

  it('falls back to unknown for anything else', () => {
    expect(classifyFailure(new ApiError({ kind: 'server', status: 500, message: 'oops' })).kind).toBe(
      'unknown'
    );
    expect(classifyFailure(new Error('plain')).kind).toBe('unknown');
  });
});

describe('repricing', () => {
  it('adjusts the total by the difference times the quantity', () => {
    const items = [
      {
        code: 'PRICE_CHANGED' as const,
        productId: 'p1',
        productName: 'Coca Cola 1.5L',
        cartPrice: 15_000,
        currentPrice: 18_000,
      },
    ];

    // 2 × (18.000 − 15.000) on top of 45.000
    expect(repricedTotal(items, { p1: 2 }, 45_000)).toBe(51_000);
  });

  it('leaves the total alone for a product no longer in the cart', () => {
    const items = [
      {
        code: 'PRICE_CHANGED' as const,
        productId: 'gone',
        productName: 'X',
        cartPrice: 1_000,
        currentPrice: 2_000,
      },
    ];
    expect(repricedTotal(items, {}, 45_000)).toBe(45_000);
  });
});

describe('resolving', () => {
  it('lands on success and keeps the result', () => {
    const current = checkoutReducer(state({ status: 'processing' }), {
      type: 'resolve',
      result: RESULT,
    });

    expect(current.status).toBe('success');
    expect(current.result).toBe(RESULT);
    expect(current.failure).toBeNull();
  });
});
