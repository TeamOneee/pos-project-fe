/**
 * Transactions and checkout.
 *
 * Owner sees every outlet, Cashier only their own, Admin has no access at all.
 *
 * Checkout is idempotent end to end: the client derives a stable key from the
 * payload, so retrying a failed-looking request returns the original sale with
 * `isDuplicate: true` instead of charging twice. That is what makes a retry
 * button safe to offer on a timeout.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  transactionsApi,
  type CheckoutInput,
  type TransactionFilters,
} from '@/lib/api/domains/transactions';
import { queryKeys } from '@/lib/query-client';

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: () => transactionsApi.list(filters),
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(transactionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.transaction(transactionId ?? ''),
    queryFn: () => transactionsApi.get(transactionId ?? ''),
    enabled: Boolean(transactionId),
    // A completed sale never changes; there is no reason to refetch it.
    staleTime: Infinity,
  });
}

/**
 * Checkout.
 *
 * Pass `idempotencyKey` to hold one key across a user-visible retry of a
 * changed payload; omitted, the key is derived from the payload itself, which
 * already collapses identical requests.
 */
export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CheckoutInput; idempotencyKey?: string }) =>
      transactionsApi.checkout(input, idempotencyKey),
    onSuccess: () => {
      // The sale emptied the cart and moved stock, so both are stale, along
      // with every figure derived from them.
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
