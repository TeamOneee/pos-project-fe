/**
 * The checkout state machine, as pure functions.
 *
 * The reason this is not just component state: the duplicate-transaction guard
 * has to be a real lock, and a lock that lives in a `disabled` prop is not one.
 * A second submit is refused *here*, before any request is built, so a double
 * tap, an Enter key on a focused button, and a retry racing an in-flight
 * request all hit the same wall.
 *
 * `checkoutRequestId` is minted once per attempt and held across retries. That
 * is what makes "Coba Lagi" safe after a connection drop: the server either
 * recognises the id and returns the sale it already made, or has never seen it
 * and makes one. Either way there is exactly one transaction (§5.2).
 *
 * There is no cart on the server (§5.2), so there is only ever one payload
 * shape — the basket, sent inline.
 */

import type { TransactionDetail } from '@/services/transactions';
import {
  conflictCondition,
  insufficientStockDetails,
  isApiError,
  priceChangedDetails,
  type InsufficientStockDetail,
  type PriceChangedDetail,
} from '@/api/errors';
import type { Rupiah } from '@/lib/money';

/**
 * S-17 offers two buttons, not three. The contract's three methods are
 * `CASH`, `QRIS` and `TRANSFER`; the till collapses the latter two into one
 * "Non-Tunai" choice and records it as `QRIS`, which is the closest thing on
 * offer. Worth a backend note if the distinction ever matters for reporting.
 */
export type PaymentMethod = 'CASH' | 'NON_CASH';

export type CheckoutStatus = 'idle' | 'processing' | 'success' | 'error';

/** The failures S-18 has to render, plus the catch-all. */
export type CheckoutFailure =
  | { kind: 'insufficient_stock'; items: InsufficientStockDetail[] }
  | { kind: 'price_changed'; items: PriceChangedDetail[] }
  /** A product or its category was deactivated while the basket was open. */
  | { kind: 'item_unavailable'; message: string }
  | { kind: 'unknown'; message: string };

export type CheckoutState = {
  status: CheckoutStatus;
  method: PaymentMethod;
  /** Cash handed over, in integer rupiah. Null until the cashier types. */
  received: Rupiah | null;
  failure: CheckoutFailure | null;
  result: TransactionDetail | null;
  /**
   * Held for the whole attempt, including retries, so the server can recognise
   * a resend. Minted on the first submit.
   */
  checkoutRequestId: string | null;
  /**
   * Whether to send `expected_unit_price` on each line.
   *
   * On by default, so price drift is caught before the sale (§5.2). Accepting
   * the server's prices turns it off, which is exactly what "sell at the new
   * price" means.
   */
  assertPrices: boolean;
};

export const initialCheckoutState: CheckoutState = {
  status: 'idle',
  method: 'CASH',
  received: null,
  failure: null,
  result: null,
  checkoutRequestId: null,
  assertPrices: true,
};

export type CheckoutAction =
  | { type: 'select-method'; method: PaymentMethod }
  | { type: 'set-received'; received: Rupiah | null }
  | { type: 'submit'; checkoutRequestId: string }
  | { type: 'resolve'; result: TransactionDetail }
  | { type: 'reject'; failure: CheckoutFailure }
  /** Price drift accepted: a different request, so it needs a different id. */
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
        // Reuse the id across retries within one attempt.
        checkoutRequestId: state.checkoutRequestId ?? action.checkoutRequestId,
      };

    case 'resolve':
      return { ...state, status: 'success', result: action.result, failure: null };

    case 'reject':
      return { ...state, status: 'error', failure: action.failure };

    case 'accept-new-prices':
      // A payload at different prices is a different request, so the old id
      // must not be reused — resending it unchanged would be an
      // IDEMPOTENCY_CONFLICT rather than a new sale.
      return {
        ...state,
        status: 'idle',
        failure: null,
        checkoutRequestId: null,
        assertPrices: false,
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
 * and an empty basket is not a sale.
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
 * Which of S-18's frames an error belongs in.
 *
 * A timeout or a dropped connection is deliberately *not* treated as a failure
 * to sell: §5.2 warns the sale may well have committed before the response was
 * lost, so it becomes the "status unknown" frame that tells the cashier to
 * check rather than charge again. `GET /transactions/status` is the endpoint
 * that settles it.
 */
export function classifyFailure(error: unknown): CheckoutFailure {
  const shortfalls = insufficientStockDetails(error);
  if (shortfalls.length > 0) return { kind: 'insufficient_stock', items: shortfalls };

  const drift = priceChangedDetails(error);
  if (drift.length > 0) return { kind: 'price_changed', items: drift };

  const condition = conflictCondition(error);
  if (condition === 'PRODUCT_INACTIVE' || condition === 'CATEGORY_INACTIVE') {
    return {
      kind: 'item_unavailable',
      message:
        condition === 'PRODUCT_INACTIVE'
          ? 'Ada produk yang sudah tidak aktif. Hapus dari keranjang untuk melanjutkan.'
          : 'Kategori produk sudah tidak aktif. Hapus produknya dari keranjang untuk melanjutkan.',
    };
  }

  if (isApiError(error) && (error.kind === 'timeout' || error.kind === 'network')) {
    return { kind: 'unknown', message: 'Koneksi terputus. Status transaksi belum diketahui.' };
  }

  return {
    kind: 'unknown',
    message: isApiError(error) ? error.message : 'Terjadi kesalahan yang tidak diketahui.',
  };
}

/* -------------------------------------------------------------------------- */
/* Repricing                                                                   */
/* -------------------------------------------------------------------------- */

/** One basket line, as the reprice calculation needs to see it. */
export type PricedLine = { unitPrice: Rupiah; quantity: number };

/**
 * The total after accepting the server's current prices.
 *
 * §5.2 reports drift by position — `errors[].field` is `items[2].product_id` —
 * and gives only the new price, never the old one. So the old price comes from
 * the basket line at that index, which is the same array that was submitted.
 *
 * A fault with no usable index cannot be priced and is skipped; the server
 * still reprices the line itself, so the figure shown is conservative rather
 * than wrong in the customer's favour.
 */
export function repricedTotal(
  faults: PriceChangedDetail[],
  lines: readonly PricedLine[],
  currentTotal: Rupiah
): Rupiah {
  return faults.reduce((total, fault) => {
    if (fault.itemIndex === null) return total;

    const line = lines[fault.itemIndex];
    if (!line) return total;

    return total + (fault.currentPrice - line.unitPrice) * line.quantity;
  }, currentTotal);
}
