/**
 * Inventory. Admin and Owner adjust and read; the cashier never touches it.
 *
 * One write exists — `POST /inventory/adjustments` — and it takes a signed
 * delta plus a reason (§4.2). Bulk adjustment and transfer between outlets are
 * not in this contract and have no client here.
 *
 * Every write invalidates the low-stock report and the operational dashboard,
 * because both are derived from the same quantities.
 */

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
 * Stock levels. Unlike the previous contract, the outlet filter is optional —
 * omitting it spans every outlet in the merchant, which is what the all-outlets
 * view wants.
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

/**
 * What a write to stock makes stale.
 *
 * Both keys are bare domain prefixes, so one call covers everything derived
 * from the quantity that just changed: every filtered inventory list, the
 * movement ledger, the low-stock report and the operational dashboard, whose
 * counts are all computed from current stock.
 */
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

/**
 * Adjust stock by a signed delta.
 *
 * 400 for a zero delta or a missing reason, 403 when the outlet is inactive,
 * and 409 when the result would go negative — in which case §4.6 guarantees
 * nothing was written at all, so no optimistic update is safe here.
 */
export function useAdjustStock() {
  const invalidate = useInventoryInvalidation();

  return useGuardedMutation(MANAGE_INVENTORY, {
    mutationFn: (input: AdjustStockInput) => inventoryApi.adjust(input),
    onSuccess: invalidate,
  });
}
