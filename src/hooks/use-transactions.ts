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

import { useAuth } from '@/components/pages/auth/auth-provider';
import {
  transactionsApi,
  type CheckoutInput,
  type TransactionFilters,
} from '@/services/transactions';
import { queryKeys } from '@/lib/query-client';
import { scopeTransactionFilters } from '@/lib/transaction-scope';

/**
 * The list, scoped to what the session may see before the request is built.
 *
 * A Cashier's `outlet_id` is overwritten with their own outlet here rather than
 * being left to the screen — the filter control being hidden is a UI decision,
 * and this is the one that holds even for a crafted filter object. The scoped
 * filters are also the query key, so one session's page can never be served from
 * another scope's cache entry.
 */
export function useTransactions(filters: TransactionFilters = {}) {
  const { role, outletId } = useAuth();
  const scoped = scopeTransactionFilters(filters, role, outletId);

  return useQuery({
    queryKey: queryKeys.transactions(scoped.filters),
    queryFn: () => transactionsApi.list(scoped.filters),
    enabled: scoped.enabled,
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
