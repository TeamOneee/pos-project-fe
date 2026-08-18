/**
 * Merchant profile.
 *
 * `GET /merchant` is readable by every role (§2.2), so this needs no `enabled`
 * guard — the app shell, the POS header and the receipt all rely on it.
 * `PATCH` is Owner only and goes through the role guard.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useGuardedMutation, type Requirement } from '@/hooks/use-guarded-mutation';
import { merchantApi, type UpdateMerchantInput } from '@/services/merchant';
import { queryKeys } from '@/lib/query-client';

const MANAGE_MERCHANT: Requirement = { resource: 'merchant', access: 'manage' };

export function useMerchant() {
  return useQuery({
    queryKey: queryKeys.merchant,
    queryFn: () => merchantApi.get(),
    // The name and timezone change about never.
    staleTime: 10 * 60_000,
  });
}

/**
 * `name` is the only editable field (§2.2).
 *
 * Nothing derived needs invalidating as a result — unlike the old contract,
 * the merchant carries no low-stock threshold, so changing it cannot move a
 * single stock verdict.
 */
export function useUpdateMerchant() {
  const queryClient = useQueryClient();

  return useGuardedMutation(MANAGE_MERCHANT, {
    mutationFn: (input: UpdateMerchantInput) => merchantApi.update(input),
    onSuccess: (merchant) => {
      queryClient.setQueryData(queryKeys.merchant, merchant);
    },
  });
}
