/**
 * Products. Admin manages, Owner reads, Cashier reads through the POS.
 *
 * Lists are paginated; `placeholderData` keeps the previous page on screen
 * while the next one loads, so paging does not flash a skeleton.
 *
 * Every write below goes through `useGuardedMutation` with the `catalog: manage`
 * requirement, so the matrix — not the screen that happened to render a button —
 * decides whether a request is ever sent. For the Owner these hooks exist and
 * reject; there is no code path from an Owner session to a POST /products.
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
    placeholderData: keepPreviousData,
  });
}

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.product(productId ?? ''),
    queryFn: () => productsApi.get(productId ?? ''),
    enabled: Boolean(productId),
  });
}

function useProductInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    // Inventory rows embed the product name and price.
    void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
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

/**
 * Editing a price is what makes an open cart fail checkout with PRICE_CHANGED,
 * so the cart is invalidated alongside the catalog.
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const invalidate = useProductInvalidation();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: ({ productId, input }: { productId: string; input: UpdateProductInput }) =>
      productsApi.update(productId, input),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
  });
}

export function useDeactivateProduct() {
  const invalidate = useProductInvalidation();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: (productId: string) => productsApi.deactivate(productId),
    onSuccess: invalidate,
  });
}
