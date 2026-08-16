/**
 * Inventory module — contract §4.7.
 *
 * Reads are open to every role; writes are ADMIN only, and the Owner reaching
 * one gets a 403. Stock never goes negative: a transfer that would overdraw the
 * source outlet fails with a 400 carrying the shortfall.
 */

import { z } from 'zod';

import { request } from '@/api/client';
import { gapField, id, isoDateTime, money, paginated, type Page } from '@/api/schema';

/** The trimmed product an inventory row carries inline. */
const embeddedProductSchema = z
  .object({
    product_id: id,
    name: z.string(),
    sku: gapField(z.string(), ''),
    price: money,
  })
  .transform((value) => ({
    productId: value.product_id,
    name: value.name,
    sku: value.sku,
    price: value.price,
  }));

export const inventorySchema = z
  .object({
    // Absent when the outlet has never stocked the product: the contract
    // answers 200 with quantity 0 rather than a 404.
    inventory_id: id.optional(),
    outlet_id: id,
    product_id: id,
    quantity: z.number(),
    updated_at: isoDateTime.optional(),
    product: embeddedProductSchema.nullable().optional(),
  })
  .transform((value) => ({
    inventoryId: value.inventory_id ?? null,
    outletId: value.outlet_id,
    productId: value.product_id,
    quantity: value.quantity,
    updatedAt: value.updated_at ?? null,
    product: value.product ?? null,
  }));

export type InventoryItem = z.infer<typeof inventorySchema>;

export const lowStockAlertSchema = z
  .object({
    inventory_id: id.optional(),
    product_id: id,
    product_name: z.string(),
    sku: gapField(z.string(), ''),
    outlet_id: id,
    outlet_name: z.string(),
    current_stock: z.number(),
    threshold: z.number(),
  })
  .transform((value) => ({
    inventoryId: value.inventory_id ?? null,
    productId: value.product_id,
    productName: value.product_name,
    sku: value.sku,
    outletId: value.outlet_id,
    outletName: value.outlet_name,
    currentStock: value.current_stock,
    threshold: value.threshold,
  }));

export type LowStockAlert = z.infer<typeof lowStockAlertSchema>;

const transferResultSchema = z
  .object({
    from_inventory: inventorySchema,
    to_inventory: inventorySchema,
    transferred_quantity: z.number(),
  })
  .transform((value) => ({
    fromInventory: value.from_inventory,
    toInventory: value.to_inventory,
    transferredQuantity: value.transferred_quantity,
  }));

export type TransferResult = z.infer<typeof transferResultSchema>;

export type InventoryFilters = {
  /** Required by the contract — inventory is always read per outlet. */
  outlet_id: string;
  product_id?: string;
  page?: number;
  limit?: number;
};

/** A manual adjustment always carries a reason; the backend rejects an empty one. */
export type AdjustInventoryInput = { quantity: number; reason: string };

export type BulkAdjustInput = {
  outlet_id: string;
  items: { inventory_id: string; quantity: number; reason: string }[];
};

export type TransferStockInput = {
  product_id: string;
  from_outlet_id: string;
  to_outlet_id: string;
  quantity: number;
  reason: string;
};

export const inventoryApi = {
  list: (filters: InventoryFilters): Promise<Page<InventoryItem>> =>
    request({
      method: 'GET',
      path: '/inventory',
      query: {
        outlet_id: filters.outlet_id,
        product_id: filters.product_id,
        page: filters.page,
        limit: filters.limit,
      },
      schema: paginated(inventorySchema),
    }),

  /** Answers 200 with quantity 0 when the pairing has no row yet. */
  getForProduct: (outletId: string, productId: string) =>
    request({
      method: 'GET',
      path: `/inventory/outlet/${outletId}/product/${productId}`,
      schema: inventorySchema,
    }),

  /** ADMIN only. 403 for anyone else, 400 without a reason. */
  adjust: (inventoryId: string, input: AdjustInventoryInput) =>
    request({
      method: 'PUT',
      path: `/inventory/${inventoryId}`,
      body: input,
      schema: inventorySchema,
    }),

  bulkAdjust: (input: BulkAdjustInput) =>
    request({
      method: 'PUT',
      path: '/inventory/bulk',
      body: input,
      schema: z.array(inventorySchema),
    }),

  /** 400 with the shortfall when the source outlet cannot cover the quantity. */
  transfer: (input: TransferStockInput) =>
    request({
      method: 'POST',
      path: '/inventory/transfer',
      body: input,
      schema: transferResultSchema,
    }),

  lowStock: (outletId?: string) =>
    request({
      method: 'GET',
      path: '/inventory/low-stock',
      query: { outlet_id: outletId },
      schema: z.array(lowStockAlertSchema),
    }),
};
