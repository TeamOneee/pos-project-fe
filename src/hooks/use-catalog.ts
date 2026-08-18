/**
 * The cashier catalogue — `GET /products/catalog` (§4.2).
 *
 * This is the POS screen's product source and it is not `GET /products`: it is
 * scoped to a single outlet, the server has already removed anything unsellable,
 * and each row carries that outlet's effective price and its stock on hand.
 *
 * `outlet_id` is required, so the query stays disabled until the session has
 * one. For a cashier that is the outlet on their token; sending any other is a
 * 403, so it is taken from the session rather than from a screen control.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { catalogApi } from '@/services/catalog';
import { queryKeys } from '@/lib/query-client';

type Options = {
  outletId: string | null;
  search?: string;
  categoryId?: string;
  size?: number;
};

export function useCatalog({ outletId, search, categoryId, size }: Options) {
  const filters = {
    outlet_id: outletId ?? '',
    search: search || undefined,
    category_id: categoryId || undefined,
    size,
  };

  return useQuery({
    queryKey: queryKeys.catalog(filters),
    queryFn: () => catalogApi.list(filters),
    enabled: Boolean(outletId),
    // Stock moves with every sale, and the tiles show it.
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}
