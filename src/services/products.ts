/** Product master — contract §3.2. */

import { z } from 'zod';

import { request } from '@/api/client';
import { id, isoDateTime, money, noData, paginated, type Page } from '@/api/schema';

/** §3.4 `ProductDto`, plus the `category_name` the list endpoint joins in. */
export const productSchema = z
  .object({
    id,
    merchant_id: id.optional(),
    category_id: id,
    category_name: z.string().nullable().optional(),
    name: z.string(),
    price: money,
    /** §4.1 rule 5: the base threshold, overridable per outlet on inventory. */
    low_stock_threshold: z.number(),
    is_active: z.boolean(),
    created_at: isoDateTime.optional(),
    updated_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    productId: value.id,
    merchantId: value.merchant_id ?? null,
    categoryId: value.category_id,
    categoryName: value.category_name ?? null,
    name: value.name,
    /** Integer rupiah. The master price, before any per-outlet override. */
    price: value.price,
    lowStockThreshold: value.low_stock_threshold,
    isActive: value.is_active,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
  }));

export type Product = z.infer<typeof productSchema>;

/** §3.4 `ProductOutletPriceDto`. */
export const productOutletPriceSchema = z
  .object({
    product_id: id,
    outlet_id: id,
    price: money,
    updated_at: isoDateTime,
  })
  .transform((value) => ({
    productId: value.product_id,
    outletId: value.outlet_id,
    /** Integer rupiah, scoped to this product/outlet pairing. */
    price: value.price,
    updatedAt: value.updated_at,
  }));

export type ProductOutletPrice = z.infer<typeof productOutletPriceSchema>;

/** §3.2: search matches the product name only — there is no SKU to match. */
export type ProductFilters = {
  category_id?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  size?: number;
};

export type CreateProductInput = {
  name: string;
  /** Decimal string, as the contract expects on the way in. */
  price: string;
  category_id: string;
  low_stock_threshold: number;
  is_active?: boolean;
};

export type UpdateProductInput = Partial<CreateProductInput>;
export type SetOutletPriceInput = { price: string };

export const productsApi = {
  /** OWNER and ADMIN. The cashier's catalogue is a different endpoint (§4.2). */
  list: (filters: ProductFilters = {}): Promise<Page<Product>> =>
    request({
      method: 'GET',
      path: '/products',
      query: {
        category_id: filters.category_id,
        is_active: filters.is_active,
        search: filters.search,
        page: filters.page,
        size: filters.size,
      },
      schema: paginated(productSchema),
    }),

  /** 400 when the category is inactive or belongs to another merchant. */
  create: (input: CreateProductInput) =>
    request({ method: 'POST', path: '/products', body: input, schema: productSchema }),

  update: (productId: string, input: UpdateProductInput) =>
    request({
      method: 'PATCH',
      path: `/products/${productId}`,
      body: input,
      schema: productSchema,
    }),

  deactivate: (productId: string) =>
    request({
      method: 'PATCH',
      path: `/products/${productId}`,
      body: { is_active: false },
      schema: productSchema,
    }),

  /** Upsert the effective price override for one outlet (§3.2, OD-002). */
  setOutletPrice: (productId: string, outletId: string, input: SetOutletPriceInput) =>
    request({
      method: 'PUT',
      path: `/products/${productId}/outlet-prices/${outletId}`,
      body: input,
      schema: productOutletPriceSchema,
    }),

  /** Remove an override so the outlet falls back to the product master price. */
  removeOutletPrice: (productId: string, outletId: string) =>
    request({
      method: 'DELETE',
      path: `/products/${productId}/outlet-prices/${outletId}`,
      schema: noData,
    }),
};
