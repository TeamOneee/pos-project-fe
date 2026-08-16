/** Categories. Admin manages, Owner reads. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  categoriesApi,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/services/categories';
import { queryKeys } from '@/lib/query-client';

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

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => categoriesApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useCategoryInvalidation();

  return useMutation({
    mutationFn: ({ categoryId, input }: { categoryId: string; input: UpdateCategoryInput }) =>
      categoriesApi.update(categoryId, input),
    onSuccess: invalidate,
  });
}

export function useDeactivateCategory() {
  const invalidate = useCategoryInvalidation();

  return useMutation({
    mutationFn: (categoryId: string) => categoriesApi.deactivate(categoryId),
    onSuccess: invalidate,
  });
}
