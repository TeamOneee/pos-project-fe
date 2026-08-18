/**
 * Transactions and checkout.
 *
 * Owner sees every outlet, Cashier only their own sales, Admin has no access at
 * all (§5.2, OD-003).
 *
 * Checkout idempotency is a body field now, not a header: the caller mints a
 * `checkout_request_id` and holds it across a retry, so resending after a
 * dropped connection returns the sale the server already made rather than
 * making a second one.
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
 * and this is the one that holds even for a crafted filter object. The server
 * additionally forces `operator_user_id` for a cashier (§5.2), so a cashier
 * sees only their own sales even within their outlet.
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
 * The receipt payload — the transaction plus the merchant and outlet header
 * fields that only this endpoint carries (§5.4 `ReceiptDto`).
 *
 * This is the only way a cashier can name their own outlet: `GET /outlets` is
 * Owner and Admin only.
 */
export function useReceipt(transactionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.receipt(transactionId ?? ''),
    queryFn: () => transactionsApi.receipt(transactionId ?? ''),
    enabled: Boolean(transactionId),
    staleTime: Infinity,
  });
}

/**
 * Exact lookup by transaction number (§5.2).
 *
 * A 404 is the "no such number" answer rather than a failure, so it is not
 * retried and the screen renders it as an empty result.
 */
export function useTransactionSearch(transactionNumber: string | undefined) {
  return useQuery({
    queryKey: queryKeys.transactions({ transaction_number: transactionNumber }),
    queryFn: () => transactionsApi.search(transactionNumber ?? ''),
    enabled: Boolean(transactionNumber),
    retry: false,
    staleTime: Infinity,
  });
}

/**
 * Checkout.
 *
 * The mutation takes the whole request including `checkout_request_id`, because
 * the id belongs to the attempt rather than to any one call — see use-checkout.ts,
 * which owns minting and holding it.
 */
export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CheckoutInput) => transactionsApi.checkout(input),
    onSuccess: () => {
      // The sale moved stock and added history, so everything derived from
      // either is stale. The cart is client-side and cleared by the screen.
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
