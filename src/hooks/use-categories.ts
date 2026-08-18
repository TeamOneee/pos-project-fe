/**
 * Categories. Admin and Owner manage, every role reads (§3.2).
 *
 * The writes go through `useGuardedMutation`, so the role matrix decides whether
 * a request leaves the client at all — see use-guarded-mutation.ts. Products and
 * categories are the same `catalog` resource in the matrix: there is no role that
 * manages one and reads the other.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useGuardedMutation, type Requirement } from '@/hooks/use-guarded-mutation';
import {
  categoriesApi,
  type CategoryFilters,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/services/categories';
import { queryKeys } from '@/lib/query-client';

const MANAGE_CATALOG: Requirement = { resource: 'catalog', access: 'manage' };

export function useCategories(filters: CategoryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.categories(filters),
    queryFn: () => categoriesApi.list(filters),
    // The catalog changes rarely and every product screen needs it.
    staleTime: 5 * 60_000,
  });
}

function useCategoryInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    // Products carry their category name, so those lists go stale too.
    void queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    // The cashier catalogue hides products whose category went inactive.
    void queryClient.invalidateQueries({ queryKey: queryKeys.catalog() });
  };
}

/** 409 when the name already exists in this merchant (DR-010). */
export function useCreateCategory() {
  const invalidate = useCategoryInvalidation();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: (input: CreateCategoryInput) => categoriesApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useCategoryInvalidation();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: ({ categoryId, input }: { categoryId: string; input: UpdateCategoryInput }) =>
      categoriesApi.update(categoryId, input),
    onSuccess: invalidate,
  });
}

/**
 * Deactivating a category is not a delete and never can be: §3.2 states the
 * contract has no `DELETE /categories/:id` at all. The products inside keep
 * their category and their own `is_active`, but they drop out of the cashier
 * catalogue and checkout refuses them with `CATEGORY_INACTIVE` until it is
 * active again.
 */
export function useDeactivateCategory() {
  const invalidate = useCategoryInvalidation();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: (categoryId: string) => categoriesApi.deactivate(categoryId),
    onSuccess: invalidate,
  });
}
