/**
 * Inventory module — contract §4.2.
 *
 * Reads are OWNER and ADMIN; adjustments are ADMIN and OWNER (§4.1 rule 1 —
 * the Owner inherits the Admin's permissions under BR-011B). The cashier never
 * touches a stock endpoint.
 *
 * Stock is written one way only: `POST /inventory/adjustments` with a signed
 * `delta` and a reason. The client never sends a target quantity — the server
 * reads the current value, applies the delta, and refuses anything that would
 * land below zero (§4.6). Two operations the previous contract had are absent
 * from §4.2 and therefore absent here: **bulk adjustment** and **transfer
 * between outlets**.
 *
 * Thresholds are two-level (§4.1 rule 5): the product carries a base
 * `low_stock_threshold`, and an inventory row may override it for its outlet.
 * `effective_low_stock_threshold` is the one the server actually compares
 * against, and the only one a screen should render a verdict from.
 */

import { z } from 'zod';

import { request } from '@/api/client';
import {
  id,
  isoDateTime,
  movementTypeSchema,
  paginated,
  type MovementType,
  type Page,
} from '@/api/schema';

/* -------------------------------------------------------------------------- */
/* Stock levels                                                                */
/* -------------------------------------------------------------------------- */

/** §4.2 `GET /inventory` row — the joined read shape, richer than `InventoryDto`. */
export const inventorySchema = z
  .object({
    id,
    outlet_id: id,
    outlet_name: z.string(),
    product_id: id,
    product_name: z.string(),
    quantity: z.number(),
    base_low_stock_threshold: z.number(),
    low_stock_threshold_override: z.number().nullable(),
    effective_low_stock_threshold: z.number(),
    is_low_stock: z.boolean(),
    updated_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    inventoryId: value.id,
    outletId: value.outlet_id,
    outletName: value.outlet_name,
    productId: value.product_id,
    productName: value.product_name,
    quantity: value.quantity,
    /** The product's own threshold, before any per-outlet override. */
    baseLowStockThreshold: value.base_low_stock_threshold,
    /** Null when this outlet has not overridden the product's threshold. */
    lowStockThresholdOverride: value.low_stock_threshold_override,
    /** Override when set, base otherwise. Compare stock against this one. */
    effectiveLowStockThreshold: value.effective_low_stock_threshold,
    /** The server's own verdict. Never recompute it on the client. */
    isLowStock: value.is_low_stock,
    updatedAt: value.updated_at ?? null,
  }));

export type InventoryItem = z.infer<typeof inventorySchema>;

/** §4.2: outlet is an optional selector — omitting it spans the whole merchant. */
export type InventoryFilters = {
  outlet_id?: string;
  product_id?: string;
  low_stock_only?: boolean;
  page?: number;
  size?: number;
};

/* -------------------------------------------------------------------------- */
/* Movements                                                                   */
/* -------------------------------------------------------------------------- */

/** §4.4 `StockMovementDto`. */
export const stockMovementSchema = z
  .object({
    id,
    outlet_id: id,
    product_id: id,
    type: movementTypeSchema,
    delta: z.number(),
    quantity_before: z.number(),
    quantity_after: z.number(),
    reason: z.string().nullable(),
    transaction_id: id.nullable(),
    actor_user_id: id,
    created_at: isoDateTime,
  })
  .transform((value) => ({
    movementId: value.id,
    outletId: value.outlet_id,
    productId: value.product_id,
    type: value.type,
    delta: value.delta,
    quantityBefore: value.quantity_before,
    quantityAfter: value.quantity_after,
    /** Always set for ADJUSTMENT; null for the SALE rows checkout writes. */
    reason: value.reason,
    transactionId: value.transaction_id,
    actorUserId: value.actor_user_id,
    createdAt: value.created_at,
  }));

export type StockMovement = z.infer<typeof stockMovementSchema>;

export type MovementFilters = {
  outlet_id?: string;
  product_id?: string;
  type?: MovementType;
  date_from?: string;
  date_to?: string;
  page?: number;
  size?: number;
};

/** §4.2 `POST /inventory/adjustments` response. */
const adjustmentResultSchema = z
  .object({
    movement_id: id,
    outlet_id: id,
    product_id: id,
    quantity_before: z.number(),
    quantity_after: z.number(),
    delta: z.number(),
    reason: z.string(),
    actor_user_id: id,
    created_at: isoDateTime,
  })
  .transform((value) => ({
    movementId: value.movement_id,
    outletId: value.outlet_id,
    productId: value.product_id,
    quantityBefore: value.quantity_before,
    quantityAfter: value.quantity_after,
    delta: value.delta,
    reason: value.reason,
    actorUserId: value.actor_user_id,
    createdAt: value.created_at,
  }));

export type AdjustmentResult = z.infer<typeof adjustmentResultSchema>;

/**
 * §4.4 `AdjustStockRequest`. `delta` is signed and may not be zero; `reason` is
 * mandatory. There is no target-quantity form of this call.
 */
export type AdjustStockInput = {
  outlet_id: string;
  product_id: string;
  delta: number;
  reason: string;
};

/* -------------------------------------------------------------------------- */
/* Client                                                                      */
/* -------------------------------------------------------------------------- */

export const inventoryApi = {
  list: (filters: InventoryFilters = {}): Promise<Page<InventoryItem>> =>
    request({
      method: 'GET',
      path: '/inventory',
      query: {
        outlet_id: filters.outlet_id,
        product_id: filters.product_id,
        low_stock_only: filters.low_stock_only,
        page: filters.page,
        size: filters.size,
      },
      schema: paginated(inventorySchema),
    }),

  /**
   * 201 on success. 400 for a zero delta or an empty reason, 403 when the
   * outlet is inactive, and 409 when the result would go negative — in which
   * case nothing was written at all.
   */
  adjust: (input: AdjustStockInput) =>
    request({
      method: 'POST',
      path: '/inventory/adjustments',
      body: input,
      schema: adjustmentResultSchema,
    }),

  movements: (filters: MovementFilters = {}): Promise<Page<StockMovement>> =>
    request({
      method: 'GET',
      path: '/inventory/movements',
      query: {
        outlet_id: filters.outlet_id,
        product_id: filters.product_id,
        type: filters.type,
        date_from: filters.date_from,
        date_to: filters.date_to,
        page: filters.page,
        size: filters.size,
      },
      schema: paginated(stockMovementSchema),
    }),
};
