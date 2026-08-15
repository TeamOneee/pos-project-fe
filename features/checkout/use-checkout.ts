/**
 * Drives a checkout attempt: the machine, the request, and the lock.
 *
 * The lock is a ref, checked before anything else happens. React state updates
 * are asynchronous, so a `disabled` button and even the reducer guard can both
 * be raced by two events dispatched in the same tick — a double tap, or Enter
 * arriving while a press is already in flight. The ref closes that window.
 *
 * The idempotency key is minted once per attempt and reused for retries, so a
 * resend after a dropped connection returns the sale the server already made
 * instead of making a second one. Accepting new prices deliberately mints a
 * fresh key, because at that point a different request is being sent.
 */

import * as React from 'react';

import {
  canConfirm,
  checkoutReducer,
  classifyFailure,
  initialCheckoutState,
  type PaymentMethod,
} from '@/features/checkout/checkout-machine';
import { useCheckout as useCheckoutMutation } from '@/hooks/use-transactions';
import type { CheckoutInput } from '@/lib/api/domains/transactions';
import type { Rupiah } from '@/lib/money';
import type { CartLine } from '@/stores/cart';

type Options = {
  cartId: string | null;
  lines: CartLine[];
  total: Rupiah;
};

/**
 * Non-Tunai collapses QRIS, transfer and card into one choice, per S-17. The
 * API has no NON_CASH member, so it is recorded as QRIS — the closest thing
 * the contract offers. Worth a backend ticket if the distinction ever matters
 * for reporting.
 */
const METHOD_FOR_API = { CASH: 'CASH', NON_CASH: 'QRIS' } as const;

export function useCheckout({ cartId, lines, total }: Options) {
  const [state, dispatch] = React.useReducer(checkoutReducer, initialCheckoutState);

  const mutation = useCheckoutMutation();

  /** The real lock. Synchronous, so nothing can slip past it. */
  const inFlight = React.useRef(false);

  const latest = React.useRef({ state, lines, total, cartId });
  React.useEffect(() => {
    latest.current = { state, lines, total, cartId };
  }, [state, lines, total, cartId]);

  const send = React.useCallback(() => {
    const current = latest.current;

    if (inFlight.current) return;
    if (!canConfirm(current.state, current.total)) return;

    inFlight.current = true;

    const idempotencyKey = current.state.idempotencyKey ?? mintKey();
    dispatch({ type: 'submit', idempotencyKey });

    const paymentMethod = METHOD_FOR_API[current.state.method];
    const input: CheckoutInput =
      current.state.payload === 'cart' && current.cartId
        ? { cart_id: current.cartId, payment_method: paymentMethod }
        : {
            items: current.lines.map((line) => ({
              product_id: line.productId,
              quantity: line.quantity,
            })),
            payment_method: paymentMethod,
          };

    mutation.mutate(
      { input, idempotencyKey },
      {
        onSuccess: (result) => {
          inFlight.current = false;
          dispatch({ type: 'resolve', result });
        },
        onError: (error) => {
          inFlight.current = false;
          dispatch({ type: 'reject', failure: classifyFailure(error) });
        },
      }
    );
  }, [mutation]);

  const selectMethod = React.useCallback(
    (method: PaymentMethod) => dispatch({ type: 'select-method', method }),
    []
  );

  const setReceived = React.useCallback(
    (received: Rupiah | null) => dispatch({ type: 'set-received', received }),
    []
  );

  /** Resends the identical request — same key, same payload. */
  const retry = React.useCallback(() => send(), [send]);

  /**
   * Accepts the server's prices and resubmits at them.
   *
   * The resubmit waits for the reducer to settle, because the new request has
   * to be built from the switched payload and the cleared key, not the ones
   * that were rejected.
   */
  const repriceThenSend = React.useRef(false);

  const acceptNewPrices = React.useCallback(() => {
    repriceThenSend.current = true;
    dispatch({ type: 'accept-new-prices' });
  }, []);

  React.useEffect(() => {
    if (!repriceThenSend.current) return;
    if (state.status !== 'idle' || state.payload !== 'items') return;

    repriceThenSend.current = false;
    send();
  }, [state.status, state.payload, send]);

  const dismissFailure = React.useCallback(() => dispatch({ type: 'dismiss-failure' }), []);

  const reset = React.useCallback(() => {
    inFlight.current = false;
    dispatch({ type: 'reset' });
  }, []);

  return {
    state,
    canConfirm: canConfirm(state, total),
    submit: send,
    retry,
    acceptNewPrices,
    dismissFailure,
    selectMethod,
    setReceived,
    reset,
  };
}

/**
 * Unique per attempt, deliberately not derived from the payload: two customers
 * buying the same single item are two sales, and a payload-derived key would
 * collapse them into one.
 */
function mintKey(): string {
  return `chk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
