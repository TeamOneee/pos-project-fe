/** Merchant profile. */

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

/** `name` is the only editable field (§2.2). */
export function useUpdateMerchant() {
  const queryClient = useQueryClient();

  return useGuardedMutation(MANAGE_MERCHANT, {
    mutationFn: (input: UpdateMerchantInput) => merchantApi.update(input),
    onSuccess: (merchant) => {
      queryClient.setQueryData(queryKeys.merchant, merchant);
    },
  });
}
