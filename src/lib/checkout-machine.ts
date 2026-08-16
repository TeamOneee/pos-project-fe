/**
 * The checkout state machine, as pure functions.
 *
 * The reason this is not just component state: the duplicate-transaction guard
 * has to be a real lock, and a lock that lives in a `disabled` prop is not one.
 * A second submit is refused *here*, before any request is built, so a double
 * tap, an Enter key on a focused button, and a retry racing an in-flight
 * request all hit the same wall.
 *
 * The idempotency key is minted once per attempt and held across retries. That
 * is what makes "Coba Lagi" safe after a connection drop: the server either
 * recognises the key and returns the sale it already made, or has never seen it
 * and makes one. Either way there is exactly one transaction.
 */

import type { CheckoutResult } from '@/services/transactions';
import {
  insufficientStockDetails,
  isApiError,
  priceChangedDetails,
  type InsufficientStockDetail,
  type PriceChangedDetail,
} from '@/api/errors';
import type { Rupiah } from '@/lib/money';

export type PaymentMethod = 'CASH' | 'NON_CASH';

export type CheckoutStatus = 'idle' | 'processing' | 'success' | 'error';

/** The three failures S-18 has to render, plus the catch-all. */
export type CheckoutFailure =
  | { kind: 'insufficient_stock'; items: InsufficientStockDetail[] }
  | { kind: 'price_changed'; items: PriceChangedDetail[] }
  | { kind: 'unknown'; message: string };

export type CheckoutState = {
  status: CheckoutStatus;
  method: PaymentMethod;
  /** Cash handed over, in integer rupiah. Null until the cashier types. */
  received: Rupiah | null;
  failure: CheckoutFailure | null;
  result: CheckoutResult | null;
  /**
   * Held for the whole attempt, including retries, so the server can recognise
   * a resend. Minted on the first submit.
   */
  idempotencyKey: string | null;
  /**
   * Which shape of request to send. The cart path is primary; the items path
   * prices at whatever the server currently holds, which is exactly what
   * accepting a price change means.
   */
  payload: 'cart' | 'items';
};

export const initialCheckoutState: CheckoutState = {
  status: 'idle',
  method: 'CASH',
  received: null,
  failure: null,
  result: null,
  idempotencyKey: null,
  payload: 'cart',
};

export type CheckoutAction =
  | { type: 'select-method'; method: PaymentMethod }
  | { type: 'set-received'; received: Rupiah | null }
  | { type: 'submit'; idempotencyKey: string }
  | { type: 'resolve'; result: CheckoutResult }
  | { type: 'reject'; failure: CheckoutFailure }
  /** Price drift accepted: prices were rewritten, so this is a fresh attempt. */
  | { type: 'accept-new-prices' }
  | { type: 'dismiss-failure' }
  | { type: 'reset' };

export function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'select-method':
      // Switching away from cash drops the amount, so a stale figure cannot
      // survive into a non-cash sale.
      return {
        ...state,
        method: action.method,
        received: action.method === 'CASH' ? state.received : null,
      };

    case 'set-received':
      return { ...state, received: action.received };

    case 'submit':
      // The lock. Anything already in flight wins.
      if (state.status === 'processing') return state;
      return {
        ...state,
        status: 'processing',
        failure: null,
        // Reuse the key across retries within one attempt.
        idempotencyKey: state.idempotencyKey ?? action.idempotencyKey,
      };

    case 'resolve':
      return { ...state, status: 'success', result: action.result, failure: null };

    case 'reject':
      return { ...state, status: 'error', failure: action.failure };

    case 'accept-new-prices':
      // A different payload at different prices is a different request, so the
      // old key must not be reused — it no longer describes what is being sent.
      return {
        ...state,
        status: 'idle',
        failure: null,
        idempotencyKey: null,
        payload: 'items',
      };

    case 'dismiss-failure':
      return { ...state, status: 'idle', failure: null };

    case 'reset':
      return initialCheckoutState;
  }
}

/* -------------------------------------------------------------------------- */
/* Derived                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Change owed, or what is still missing. Negative means the cashier has not
 * been handed enough yet.
 */
export function changeFor(total: Rupiah, received: Rupiah | null): Rupiah {
  return (received ?? 0) - total;
}

/** True while the cash tendered does not cover the bill. */
export function isShort(total: Rupiah, received: Rupiah | null): boolean {
  return changeFor(total, received) < 0;
}

/**
 * Whether confirming is allowed right now.
 *
 * Cash needs enough money on the counter. Non-cash needs nothing — it is
 * recorded, not processed. Neither may proceed while a request is in flight,
 * and an empty cart is not a sale.
 */
export function canConfirm(state: CheckoutState, total: Rupiah): boolean {
  if (state.status === 'processing' || state.status === 'success') return false;
  if (total <= 0) return false;
  if (state.method === 'NON_CASH') return true;

  return state.received !== null && !isShort(total, state.received);
}

/** The modal refuses to close while the request is outstanding. */
export function isDismissable(state: CheckoutState): boolean {
  return state.status !== 'processing';
}

/* -------------------------------------------------------------------------- */
/* Failure classification                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Which of S-18's three frames an error belongs in.
 *
 * A timeout or a dropped connection is deliberately *not* treated as a
 * failure to sell: the request may well have succeeded, so it becomes the
 * "status unknown" frame that tells the cashier to check history rather than
 * charge again.
 */
export function classifyFailure(error: unknown): CheckoutFailure {
  const shortfalls = insufficientStockDetails(error);
  if (shortfalls.length > 0) return { kind: 'insufficient_stock', items: shortfalls };

  const drift = priceChangedDetails(error);
  if (drift.length > 0) return { kind: 'price_changed', items: drift };

  if (isApiError(error) && (error.kind === 'timeout' || error.kind === 'network')) {
    return { kind: 'unknown', message: 'Koneksi terputus. Status transaksi belum diketahui.' };
  }

  return {
    kind: 'unknown',
    message: isApiError(error) ? error.message : 'Terjadi kesalahan yang tidak diketahui.',
  };
}

/** The total after accepting the server's current prices. */
export function repricedTotal(
  items: PriceChangedDetail[],
  quantities: Record<string, number>,
  currentTotal: Rupiah
): Rupiah {
  return items.reduce((total, item) => {
    const quantity = quantities[item.productId] ?? 0;
    return total + (item.currentPrice - item.cartPrice) * quantity;
  }, currentTotal);
}
