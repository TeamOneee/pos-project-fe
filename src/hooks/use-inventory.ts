/**
 * Inventory. Admin adjusts, transfers and bulk-updates; Owner and Cashier read.
 *
 * Every write invalidates the low-stock alerts and the Admin dashboard, because
 * both are derived from the same quantities.
 */

import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

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

/**
 * One product's stock in every outlet, for the per-outlet drawer (S-15b).
 *
 * There is no cross-outlet inventory endpoint, so this fans out over the
 * per-pairing one. The keys are the same ones `useInventoryForProduct` uses,
 * so an adjustment made from the drawer refreshes the row it was made on.
 */
export function useProductStockByOutlet(
  productId: string | undefined,
  outletIds: readonly string[]
) {
  return useQueries({
    queries: outletIds.map((outletId) => ({
      queryKey: queryKeys.inventoryItem(outletId, productId ?? ''),
      queryFn: () => inventoryApi.getForProduct(outletId, productId ?? ''),
      enabled: Boolean(productId),
    })),
  });
}

/**
 * Several products' stock at one outlet — the transpose of the above, for the
 * bulk-update table. It also resolves each row's `inventoryId`, which is what
 * `PUT /inventory/bulk` addresses rows by and which a product picked from the
 * catalogue does not carry.
 */
export function useStockForProducts(outletId: string | undefined, productIds: readonly string[]) {
  return useQueries({
    queries: productIds.map((productId) => ({
      queryKey: queryKeys.inventoryItem(outletId ?? '', productId),
      queryFn: () => inventoryApi.getForProduct(outletId ?? '', productId),
      enabled: Boolean(outletId),
    })),
  });
}

export function useLowStock(outletId?: string) {
  return useQuery({
    queryKey: queryKeys.lowStock(outletId),
    queryFn: () => inventoryApi.lowStock(outletId),
  });
}

/**
 * What a write to stock makes stale.
 *
 * Both keys are bare domain prefixes, so one call covers everything derived
 * from the quantity that just changed: every filtered inventory list, every
 * per-outlet/product row behind the drawer, the low-stock alerts, and the
 * Admin dashboard whose four KPI tiles and three tables are all computed from
 * current stock. An adjustment anywhere therefore moves the dashboard counts.
 */
function useInventoryInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    // ['inventory'] — list, detail and low-stock all hang off this prefix.
    void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
    // ['dashboard'] — the Admin stock dashboard, per outlet and across all.
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
