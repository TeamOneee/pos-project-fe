/** Outlets. */

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useGuardedMutation, type Requirement } from '@/hooks/use-guarded-mutation';
import {
  outletsApi,
  type CreateOutletInput,
  type Outlet,
  type OutletFilters,
  type UpdateOutletInput,
} from '@/services/outlets';
import { useAuth } from '@/components/pages/auth/auth-provider';
import { can } from '@/lib/permissions';
import { queryKeys } from '@/lib/query-client';

const MANAGE_OUTLETS: Requirement = { resource: 'outlets', access: 'manage' };

/** The outlet list, fetched only for roles that may read it. */
export function useOutlets(filters: OutletFilters = {}) {
  const { role } = useAuth();
  const allowed = role !== null && can(role, 'outlets', 'read');

  return useQuery({
    queryKey: queryKeys.outlets(filters),
    queryFn: () => outletsApi.list(filters),
    enabled: allowed,
    staleTime: 5 * 60_000,
  });
}

/** One outlet, resolved from the list. Undefined until the list has loaded. */
export function useOutlet(outletId: string | undefined): Outlet | undefined {
  const outlets = useOutlets();
  if (!outletId) return undefined;
  return outlets.data?.items.find((outlet) => outlet.outletId === outletId);
}

function useOutletInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.outlets() });
    // Outlet counts and per-outlet figures feed the dashboards.
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useCreateOutlet() {
  const invalidate = useOutletInvalidation();

  return useGuardedMutation(MANAGE_OUTLETS, {
    mutationFn: (input: CreateOutletInput) => outletsApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateOutlet() {
  const invalidate = useOutletInvalidation();
  const queryClient = useQueryClient();

  return useGuardedMutation(MANAGE_OUTLETS, {
    mutationFn: ({ outletId, input }: { outletId: string; input: UpdateOutletInput }) =>
      outletsApi.update(outletId, input),
    onMutate: async ({ outletId, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.outlets() });
      const previousOutlets = queryClient.getQueryData(queryKeys.outlets());

      queryClient.setQueriesData(
        { queryKey: queryKeys.outlets() },
        (old: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
          if (!old || !old.items) return old;
          return {
            ...old,
            items: old.items.map(
              (outlet: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) =>
                outlet.outletId === outletId
                  ? {
                      ...outlet,
                      ...(input.name !== undefined ? { name: input.name } : {}),
                      ...(input.address !== undefined ? { address: input.address } : {}),
                      ...(input.status !== undefined ? { status: input.status } : {}),
                    }
                  : outlet
            ),
          };
        }
      );

      return { previousOutlets };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousOutlets) {
        queryClient.setQueriesData({ queryKey: queryKeys.outlets() }, context.previousOutlets);
      }
    },
    onSettled: () => {
      invalidate();
    },
  });
}

/**
 * Deactivating an outlet makes it read-only for business operations: no checkout against it, no
 * stock adjustment, and its cashiers cannot operate (§2.2 warning, FR-TEN-004).
 */
export function useDeactivateOutlet() {
  const queryClient = useQueryClient();
  const invalidate = useOutletInvalidation();

  return useGuardedMutation(MANAGE_OUTLETS, {
    mutationFn: (outletId: string) => outletsApi.deactivate(outletId),
    onMutate: async (outletId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.outlets() });
      const previousOutlets = queryClient.getQueryData(queryKeys.outlets());

      queryClient.setQueriesData(
        { queryKey: queryKeys.outlets() },
        (old: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
          if (!old || !old.items) return old;
          return {
            ...old,
            items: old.items.map(
              (outlet: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) =>
                outlet.outletId === outletId ? { ...outlet, status: 'INACTIVE' } : outlet
            ),
          };
        }
      );

      return { previousOutlets };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousOutlets) {
        queryClient.setQueriesData({ queryKey: queryKeys.outlets() }, context.previousOutlets);
      }
    },
    onSettled: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
    },
  });
}
