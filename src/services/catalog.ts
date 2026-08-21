/** Cashier catalogue — contract §4.2 `GET /products/catalog`. */

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
   * 400 without an `outlet_id`; 403 when the outlet is not the cashier's own, or is inactive, or
   * sits outside the merchant.
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
