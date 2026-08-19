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

/**
 * Editing a price is what makes an open basket fail checkout with
 * `PRICE_CHANGED` — the cart is client-side now, so there is nothing on the
 * server to invalidate, but the catalogue the tiles are priced from is.
 */
export function useUpdateProduct() {
  const invalidate = useProductInvalidation();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: ({ productId, input }: { productId: string; input: UpdateProductInput }) =>
      productsApi.update(productId, input),
    onSuccess: invalidate,
  });
}

/** Soft-deactivation. Past sales keep their own name and price snapshot. */
export function useDeactivateProduct() {
  const invalidate = useProductInvalidation();

  return useGuardedMutation(MANAGE_CATALOG, {
    mutationFn: (productId: string) => productsApi.deactivate(productId),
    onSuccess: invalidate,
  });
}
