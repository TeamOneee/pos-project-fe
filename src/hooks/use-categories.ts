/**
 * Categories. Admin manages, Owner reads.
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
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/services/categories';
import { queryKeys } from '@/lib/query-client';

const MANAGE_CATALOG: Requirement = { resource: 'catalog', access: 'manage' };

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => categoriesApi.list(),
    // The catalog changes rarely and every product screen needs it.
    staleTime: 5 * 60_000,
  });
}

function useCategoryInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    // Products embed their category name, so those lists go stale too.
    void queryClient.invalidateQueries({ queryKey: queryKeys.products() });
  };
}

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
 * Deactivating a category is not a delete: the products keep it, they simply
 * stop being sellable. The POS catalog is derived from the same two lists, so
 * invalidating them is what makes those tiles disappear.
 */
export function useDeactivateCategory() {
  const invalidate = useCategoryInvalidation();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: (categoryId: string) => categoriesApi.deactivate(categoryId),
    onSuccess: invalidate,
  });
}
