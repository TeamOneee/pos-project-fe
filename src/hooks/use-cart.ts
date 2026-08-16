/**
 * The server-side cart. Cashier only.
 *
 * Every mutation returns the whole cart, so the response is written straight
 * into the cache rather than triggering a refetch — the POS has to feel
 * immediate, and a round trip per tap would not.
 *
 * A 404 means "no open cart yet", which is a normal empty state, not an error.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cartApi, type AddCartItemInput, type Cart } from '@/services/cart';
import { isApiErrorOfKind } from '@/api/errors';
import { queryKeys } from '@/lib/query-client';

export function useCart(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.cart,
    queryFn: () => cartApi.get(),
    enabled: options.enabled ?? true,
    // An empty cart is not a failure worth retrying.
    retry: (failureCount, error) => !isApiErrorOfKind(error, 'not_found') && failureCount < 1,
  });
}

/** Writes the returned cart into the cache; no refetch follows. */
function useCartWriter() {
  const queryClient = useQueryClient();
  return (cart: Cart) => queryClient.setQueryData(queryKeys.cart, cart);
}

/** 400 with the shortfall when the outlet cannot cover the quantity. */
export function useAddCartItem() {
  const write = useCartWriter();

  return useMutation({
    mutationFn: (input: AddCartItemInput) => cartApi.addItem(input),
    onSuccess: write,
  });
}

export function useUpdateCartItem() {
  const write = useCartWriter();

  return useMutation({
    mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
      cartApi.updateItem(cartItemId, quantity),
    onSuccess: write,
  });
}

export function useRemoveCartItem() {
  const write = useCartWriter();

  return useMutation({
    mutationFn: (cartItemId: string) => cartApi.removeItem(cartItemId),
    onSuccess: write,
  });
}

export function useClearCart() {
  const write = useCartWriter();

  return useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: write,
  });
}
