/**
 * Inventory. Admin adjusts, transfers and bulk-updates; Owner and Cashier read.
 *
 * Every write invalidates the low-stock alerts and the Admin dashboard, because
 * both are derived from the same quantities.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  inventoryApi,
  type AdjustInventoryInput,
  type BulkAdjustInput,
  type InventoryFilters,
  type TransferStockInput,
} from '@/services/inventory';
import { queryKeys } from '@/lib/query-client';

/** Requires an outlet: inventory is always read one outlet at a time. */
export function useInventory(filters: Partial<InventoryFilters> & { outlet_id?: string }) {
  const outletId = filters.outlet_id;

  return useQuery({
    queryKey: queryKeys.inventory(filters),
    queryFn: () => inventoryApi.list({ ...filters, outlet_id: outletId ?? '' }),
    enabled: Boolean(outletId),
    placeholderData: keepPreviousData,
  });
}

/** Answers quantity 0 rather than 404 when the pairing has no row yet. */
export function useInventoryForProduct(
  outletId: string | undefined,
  productId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.inventoryItem(outletId ?? '', productId ?? ''),
    queryFn: () => inventoryApi.getForProduct(outletId ?? '', productId ?? ''),
    enabled: Boolean(outletId && productId),
  });
}

export function useLowStock(outletId?: string) {
  return useQuery({
    queryKey: queryKeys.lowStock(outletId),
    queryFn: () => inventoryApi.lowStock(outletId),
  });
}

function useInventoryInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

/** 400 without a reason, 403 for anyone who is not an Admin. */
export function useAdjustInventory() {
  const invalidate = useInventoryInvalidation();

  return useMutation({
    mutationFn: ({ inventoryId, input }: { inventoryId: string; input: AdjustInventoryInput }) =>
      inventoryApi.adjust(inventoryId, input),
    onSuccess: invalidate,
  });
}

export function useBulkAdjustInventory() {
  const invalidate = useInventoryInvalidation();

  return useMutation({
    mutationFn: (input: BulkAdjustInput) => inventoryApi.bulkAdjust(input),
    onSuccess: invalidate,
  });
}

/** 400 with the shortfall when the source outlet cannot cover the quantity. */
export function useTransferStock() {
  const invalidate = useInventoryInvalidation();

  return useMutation({
    mutationFn: (input: TransferStockInput) => inventoryApi.transfer(input),
    onSuccess: invalidate,
  });
}
