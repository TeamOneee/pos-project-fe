/** Merchant settings. Owner only. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { merchantsApi, type UpdateMerchantInput } from '@/lib/api/domains/merchants';
import { queryKeys } from '@/lib/query-client';

/** Owner-only endpoint, so callers that may run as another role pass `enabled`. */
export function useMerchant(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.merchant,
    queryFn: () => merchantsApi.get(),
    enabled: options.enabled ?? true,
  });
}

export function useUpdateMerchant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMerchantInput) => merchantsApi.update(input),
    onSuccess: (merchant) => {
      queryClient.setQueryData(queryKeys.merchant, merchant);
      // The low-stock threshold decides which rows count as low, so every
      // stock view has to be recomputed.
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
