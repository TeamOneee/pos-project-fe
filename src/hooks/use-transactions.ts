/** Transactions and checkout. */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/components/pages/auth/auth-provider';
import {
  transactionsApi,
  type CheckoutInput,
  type TransactionFilters,
} from '@/services/transactions';
import { queryKeys } from '@/lib/query-client';
import { scopeTransactionFilters } from '@/lib/transaction-scope';

/** The list, scoped to what the session may see before the request is built. */
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
 * The receipt payload — the transaction plus the merchant and outlet header fields that only this
 * endpoint carries (§5.4 `ReceiptDto`).
 */
export function useReceipt(transactionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.receipt(transactionId ?? ''),
    queryFn: () => transactionsApi.receipt(transactionId ?? ''),
    enabled: Boolean(transactionId),
    staleTime: Infinity,
  });
}

/** Exact lookup by transaction number (§5.2). */
export function useTransactionSearch(transactionNumber: string | undefined) {
  return useQuery({
    queryKey: queryKeys.transactions({ transaction_number: transactionNumber }),
    queryFn: () => transactionsApi.search(transactionNumber ?? ''),
    enabled: Boolean(transactionNumber),
    retry: false,
    staleTime: Infinity,
  });
}

/** Checkout. */
export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CheckoutInput) => transactionsApi.checkout(input),
    onSuccess: () => {
      // The sale moved stock and added history, so everything derived from either is stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
