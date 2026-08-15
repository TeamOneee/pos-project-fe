/** Outlets. Owner manages; every role may read them for filters. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  outletsApi,
  type CreateOutletInput,
  type OutletFilters,
  type UpdateOutletInput,
} from '@/lib/api/domains/outlets';
import { queryKeys } from '@/lib/query-client';

export function useOutlets(filters: OutletFilters = {}) {
  return useQuery({
    queryKey: queryKeys.outlets(filters),
    queryFn: () => outletsApi.list(filters),
  });
}

export function useOutlet(outletId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.outlet(outletId ?? ''),
    queryFn: () => outletsApi.get(outletId ?? ''),
    enabled: Boolean(outletId),
  });
}

/** Invalidate every outlet list, plus the dashboards that count outlets. */
function useOutletInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.outlets() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useCreateOutlet() {
  const invalidate = useOutletInvalidation();

  return useMutation({
    mutationFn: (input: CreateOutletInput) => outletsApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateOutlet() {
  const invalidate = useOutletInvalidation();

  return useMutation({
    mutationFn: ({ outletId, input }: { outletId: string; input: UpdateOutletInput }) =>
      outletsApi.update(outletId, input),
    onSuccess: invalidate,
  });
}

export function useDeactivateOutlet() {
  const invalidate = useOutletInvalidation();

  return useMutation({
    mutationFn: (outletId: string) => outletsApi.deactivate(outletId),
    onSuccess: invalidate,
  });
}
