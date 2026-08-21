/** The cashier catalogue — `GET /products/catalog` (§4.2). */

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
