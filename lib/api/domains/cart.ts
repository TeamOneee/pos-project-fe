/**
 * Cart module — contract §4.8. Cashier only.
 *
 * This is the server-side cart, which TanStack Query owns. The Zustand cart
 * store holds only what the POS screen needs locally between keystrokes —
 * the two are not mirrors of each other.
 *
 * Total = subtotal (CLAUDE.md rule 2). There is no discount, tax or service
 * charge field here, and there must never be one.
 */

import { z } from 'zod';

import { request } from '@/lib/api/client';
import { gapField, id, isoDateTime, money } from '@/lib/api/schema';

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

export const cartItemSchema = z
  .object({
    cart_item_id: id,
    cart_id: id.optional(),
    product_id: id,
    quantity: z.number(),
    unit_price: money,
    subtotal: money,
    product: embeddedProductSchema.nullable().optional(),
  })
  .transform((value) => ({
    cartItemId: value.cart_item_id,
    cartId: value.cart_id ?? null,
    productId: value.product_id,
    quantity: value.quantity,
    /** Integer rupiah, captured when the line was added. */
    unitPrice: value.unit_price,
    subtotal: value.subtotal,
    product: value.product ?? null,
  }));

export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z
  .object({
    cart_id: id,
    outlet_id: id.optional(),
    user_id: id.optional(),
    items: z.array(cartItemSchema),
    subtotal: money,
    total_items: z.number(),
    created_at: isoDateTime.optional(),
    updated_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    cartId: value.cart_id,
    outletId: value.outlet_id ?? null,
    userId: value.user_id ?? null,
    items: value.items,
    /** Integer rupiah. The total equals this exactly. */
    subtotal: value.subtotal,
    totalItems: value.total_items,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
  }));

export type Cart = z.infer<typeof cartSchema>;

export type AddCartItemInput = { product_id: string; quantity: number };

export const cartApi = {
  /** 404 when the cashier has no open cart yet. */
  get: () => request({ method: 'GET', path: '/cart', schema: cartSchema }),

  /** 400 with the shortfall when the outlet cannot cover the quantity. */
  addItem: (input: AddCartItemInput) =>
    request({ method: 'POST', path: '/cart/items', body: input, schema: cartSchema }),

  updateItem: (cartItemId: string, quantity: number) =>
    request({
      method: 'PUT',
      path: `/cart/items/${cartItemId}`,
      body: { quantity },
      schema: cartSchema,
    }),

  removeItem: (cartItemId: string) =>
    request({ method: 'DELETE', path: `/cart/items/${cartItemId}`, schema: cartSchema }),

  clear: () => request({ method: 'DELETE', path: '/cart/clear', schema: cartSchema }),
};
