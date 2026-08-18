/**
 * Cashier catalogue — contract §4.2 `GET /products/catalog`.
 *
 * This is the POS screen's only product source, and it is a different endpoint
 * from `GET /products`: it is scoped to one outlet, it already excludes
 * everything unsellable, and its `price` is the **effective** price for that
 * outlet (a `product_outlet_price` override when one exists, the master price
 * otherwise — OD-002).
 *
 * The server decides visibility, not the client: a row appears only when the
 * product is active, its category is active, and an inventory row exists for
 * it at that outlet (FR-CAT-006, FR-CAT-011–012).
 *
 * `outlet_id` is mandatory. A CASHIER must pass the outlet on their own token;
 * an OWNER passes an active outlet of their merchant. Anything else is a 403.
 */

import { z } from 'zod';

import { request } from '@/api/client';
import { id, money, paginated, type Page } from '@/api/schema';

/** §4.2 `CatalogProductDto`. */
export const catalogProductSchema = z
  .object({
    id,
    name: z.string(),
    price: money,
    category_id: id,
    stock_quantity: z.number(),
  })
  .transform((value) => ({
    productId: value.id,
    name: value.name,
    /** Integer rupiah, already resolved to this outlet's effective price. */
    price: value.price,
    categoryId: value.category_id,
    /** Stock at this outlet, which is the ceiling for a cart line. */
    stockQuantity: value.stock_quantity,
  }));

export type CatalogProduct = z.infer<typeof catalogProductSchema>;

export type CatalogFilters = {
  outlet_id: string;
  search?: string;
  category_id?: string;
  page?: number;
  size?: number;
};

export const catalogApi = {
  /**
   * 400 without an `outlet_id`; 403 when the outlet is not the cashier's own,
   * or is inactive, or sits outside the merchant.
   */
  list: (filters: CatalogFilters): Promise<Page<CatalogProduct>> =>
    request({
      method: 'GET',
      path: '/products/catalog',
      query: {
        outlet_id: filters.outlet_id,
        search: filters.search,
        category_id: filters.category_id,
        page: filters.page,
        size: filters.size,
      },
      schema: paginated(catalogProductSchema),
    }),
};
