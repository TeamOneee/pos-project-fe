/** Drives a checkout attempt: the machine, the request, and the lock. */

import * as React from 'react';

import {
  canConfirm,
  checkoutReducer,
  classifyFailure,
  initialCheckoutState,
  type PaymentMethod,
} from '@/lib/checkout-machine';
import { useCheckout as useCheckoutMutation } from '@/hooks/use-transactions';
import { mintCheckoutRequestId, type CheckoutInput } from '@/services/transactions';
import { formatMoneyForApi } from '@/lib/money';
import type { Rupiah } from '@/lib/money';
import type { CartLine } from '@/stores/cart';

type Options = {
  /** Required by §5.2. A cashier's own outlet; an Owner's selected outlet. */
  outletId: string | null;
  lines: CartLine[];
  total: Rupiah;
};

/**
 * §5.1 lists `CASH`, `QRIS` and `TRANSFER`. The till offers two buttons, so Non-Tunai is recorded
 * as `QRIS` — the closest thing the contract offers.
 */
const METHOD_FOR_API = { CASH: 'CASH', NON_CASH: 'QRIS' } as const;

export function useCheckout({ outletId, lines, total }: Options) {
  const [state, dispatch] = React.useReducer(checkoutReducer, initialCheckoutState);

  const mutation = useCheckoutMutation();

  /** The real lock. Synchronous, so nothing can slip past it. */
  const inFlight = React.useRef(false);

  const latest = React.useRef({ state, lines, total, outletId });
  React.useEffect(() => {
    latest.current = { state, lines, total, outletId };
  }, [state, lines, total, outletId]);

  const send = React.useCallback(() => {
    const current = latest.current;

    if (inFlight.current) return;
    if (!current.outletId) return;
    if (!canConfirm(current.state, current.total)) return;

    inFlight.current = true;

    const checkoutRequestId = current.state.checkoutRequestId ?? mintCheckoutRequestId();
    dispatch({ type: 'submit', checkoutRequestId });

    const input: CheckoutInput = {
      checkout_request_id: checkoutRequestId,
      outlet_id: current.outletId,
      payment_method: METHOD_FOR_API[current.state.method],
      items: current.lines.map((line) => ({
        product_id: line.productId,
        quantity: line.quantity,
        // Omitted once the cashier has accepted the server's prices, which is what turns the next
        // attempt into "sell at whatever it costs now".
        ...(current.state.assertPrices
          ? { expected_unit_price: formatMoneyForApi(line.unitPrice) }
          : {}),
      })),
    };

    mutation.mutate(input, {
      onSuccess: (result) => {
        inFlight.current = false;
        dispatch({ type: 'resolve', result });
      },
      onError: (error) => {
        inFlight.current = false;
        dispatch({ type: 'reject', failure: classifyFailure(error) });
      },
    });
  }, [mutation]);

  const selectMethod = React.useCallback(
    (method: PaymentMethod) => dispatch({ type: 'select-method', method }),
    []
  );

  const setReceived = React.useCallback(
    (received: Rupiah | null) => dispatch({ type: 'set-received', received }),
    []
  );

  /** Resends the identical request — same id, same payload. */
  const retry = React.useCallback(() => send(), [send]);

  /** Accepts the server's prices and resubmits at them. */
  const repriceThenSend = React.useRef(false);

  const acceptNewPrices = React.useCallback(() => {
    repriceThenSend.current = true;
    dispatch({ type: 'accept-new-prices' });
  }, []);

  React.useEffect(() => {
    if (!repriceThenSend.current) return;
    if (state.status !== 'idle' || state.assertPrices) return;

    repriceThenSend.current = false;
    send();
  }, [state.status, state.assertPrices, send]);

  const dismissFailure = React.useCallback(() => dispatch({ type: 'dismiss-failure' }), []);

  const reset = React.useCallback(() => {
    inFlight.current = false;
    dispatch({ type: 'reset' });
  }, []);

  return {
    state,
    canConfirm: canConfirm(state, total) && outletId !== null,
    submit: send,
    retry,
    acceptNewPrices,
    dismissFailure,
    selectMethod,
    setReceived,
    reset,
  };
}
