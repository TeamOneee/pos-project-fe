/** Inventory. Admin and Owner adjust and read; the cashier never touches it. */

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import { useGuardedMutation, type Requirement } from '@/hooks/use-guarded-mutation';
import {
  inventoryApi,
  type AdjustStockInput,
  type InventoryFilters,
  type MovementFilters,
} from '@/services/inventory';
import { queryKeys } from '@/lib/query-client';

const MANAGE_INVENTORY: Requirement = { resource: 'inventory', access: 'manage' };

/**
 * Stock levels. Unlike the previous contract, the outlet filter is optional — omitting it spans
 * every outlet in the merchant, which is what the all-outlets view wants.
 */
export function useInventory(filters: InventoryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.inventory(filters),
    queryFn: () => inventoryApi.list(filters),
    placeholderData: keepPreviousData,
  });
}

/** One product's stock across outlets, for the per-outlet drawer (S-15b). */
export function useProductStock(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inventory({ product_id: productId }),
    queryFn: () => inventoryApi.list({ product_id: productId ?? '', size: 100 }),
    enabled: Boolean(productId),
  });
}

/** The movement ledger. Read-only, Owner and Admin (§4.2). */
export function useStockMovements(filters: MovementFilters = {}) {
  return useQuery({
    queryKey: queryKeys.movements(filters),
    queryFn: () => inventoryApi.movements(filters),
    placeholderData: keepPreviousData,
  });
}

/** What a write to stock makes stale. */
function useInventoryInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    // ['inventory'] — lists and movements both hang off this prefix.
    void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
    // ['dashboard'] — operations and low-stock are computed from stock.
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    // A product that was out of stock can reappear in the cashier catalogue.
    void queryClient.invalidateQueries({ queryKey: queryKeys.catalog() });
  };
}

/** Adjust stock by a signed delta. */
export function useAdjustStock() {
  const invalidate = useInventoryInvalidation();

  return useGuardedMutation(MANAGE_INVENTORY, {
    mutationFn: (input: AdjustStockInput) => inventoryApi.adjust(input),
    onSuccess: invalidate,
  });
}
