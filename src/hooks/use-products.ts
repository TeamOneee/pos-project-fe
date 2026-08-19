/**
 * Products. Admin and Owner manage; `GET /products` is Owner and Admin only.
 *
 * A cashier never reaches this module — their catalogue is `GET /products/catalog`
 * in use-catalog.ts, which is a different endpoint with different scoping.
 *
 * Lists are paginated; `placeholderData` keeps the previous page on screen
 * while the next one loads, so paging does not flash a skeleton.
 *
 * There is no `GET /products/:id`, so a screen that needs one product takes it
 * from the list it already loaded.
 */

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import { useGuardedMutation, type Requirement } from '@/hooks/use-guarded-mutation';
import {
  productsApi,
  type CreateProductInput,
  type ProductFilters,
  type UpdateProductInput,
} from '@/services/products';
import { queryKeys } from '@/lib/query-client';

/** The catalog is one resource in the matrix: products and categories together. */
const MANAGE_CATALOG: Requirement = { resource: 'catalog', access: 'manage' };

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: () => productsApi.list(filters),
    // Longer than the default: catalogue edits invalidate the list on write,
    // so a read only refetches when it actually changed — not on every visit.
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

function useProductInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    // Inventory rows carry the product name and its base threshold.
    void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
    // The cashier catalogue prices and filters from the same product row.
    void queryClient.invalidateQueries({ queryKey: queryKeys.catalog() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

/** 400 when the category is inactive or belongs to another merchant. */
export function useCreateProduct() {
  const invalidate = useProductInvalidation();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: (input: CreateProductInput) => productsApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useProductInvalidation();
  const queryClient = useQueryClient();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: ({ productId, input }: { productId: string; input: UpdateProductInput }) =>
      productsApi.update(productId, input),
    onMutate: async ({ productId, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products() });
      const previousProducts = queryClient.getQueryData(queryKeys.products());

      queryClient.setQueriesData({ queryKey: queryKeys.products() }, (old: any) => {
        if (!old || !old.items) return old;
        return {
          ...old,
          items: old.items.map((prod: any) =>
            prod.productId === productId
              ? {
                  ...prod,
                  ...(input.name !== undefined ? { name: input.name } : {}),
                  ...(input.price !== undefined ? { price: parseInt(input.price, 10) } : {}),
                  ...(input.category_id !== undefined ? { categoryId: input.category_id } : {}),
                  ...(input.low_stock_threshold !== undefined
                    ? { lowStockThreshold: input.low_stock_threshold }
                    : {}),
                  ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
                }
              : prod
          ),
        };
      });

      return { previousProducts };
    },
    onError: (err, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueriesData({ queryKey: queryKeys.products() }, context.previousProducts);
      }
    },
    onSettled: () => {
      invalidate();
    },
  });
}

/** Soft-deactivation. Past sales keep their own name and price snapshot. */
export function useDeactivateProduct() {
  const invalidate = useProductInvalidation();
  const queryClient = useQueryClient();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: (productId: string) => productsApi.deactivate(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products() });
      const previousProducts = queryClient.getQueryData(queryKeys.products());

      queryClient.setQueriesData({ queryKey: queryKeys.products() }, (old: any) => {
        if (!old || !old.items) return old;
        return {
          ...old,
          items: old.items.map((prod: any) =>
            prod.productId === productId ? { ...prod, isActive: false } : prod
          ),
        };
      });

      return { previousProducts };
    },
    onError: (err, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueriesData({ queryKey: queryKeys.products() }, context.previousProducts);
      }
    },
    onSettled: () => {
      invalidate();
    },
  });
}
