/**
 * Product module — contract §4.6.
 *
 * `sku` is a known backend gap — specified by the contract, absent from the
 * Prisma schema. It stays in the client type and the mock serves it.
 *
 * `price` crosses the boundary as a decimal string and leaves this file as
 * integer rupiah. Nothing downstream ever sees the string form.
 */

import { z } from 'zod';

import { request } from '@/api/client';
import {
  gapField,
  id,
  isoDateTime,
  money,
  noData,
  paginated,
  statusSchema,
  type Page,
  type Status,
} from '@/api/schema';

/** The trimmed category a product carries inline. */
const embeddedCategorySchema = z
  .object({ category_id: id, name: z.string() })
  .transform((value) => ({ categoryId: value.category_id, name: value.name }));

export const productSchema = z
  .object({
    product_id: id,
    merchant_id: id.optional(),
    category_id: id.nullable().optional(),
    name: z.string(),
    sku: gapField(z.string(), ''),
    price: money,
    status: statusSchema,
    created_at: isoDateTime.optional(),
    updated_at: isoDateTime.optional(),
    category: embeddedCategorySchema.nullable().optional(),
  })
  .transform((value) => ({
    productId: value.product_id,
    merchantId: value.merchant_id ?? null,
    categoryId: value.category_id ?? null,
    name: value.name,
    sku: value.sku,
    /** Integer rupiah. */
    price: value.price,
    status: value.status,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
    category: value.category ?? null,
  }));

export type Product = z.infer<typeof productSchema>;

export type ProductFilters = {
  category_id?: string;
  status?: Status;
  /** Matches name or SKU. */
  search?: string;
  page?: number;
  limit?: number;
};

export type CreateProductInput = {
  name: string;
  sku: string;
  /** Decimal string, as the contract expects on the way in. */
  price: string;
  category_id: string;
  status?: Status;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export const productsApi = {
  list: (filters: ProductFilters = {}): Promise<Page<Product>> =>
    request({
      method: 'GET',
      path: '/products',
      query: {
        category_id: filters.category_id,
        status: filters.status,
        search: filters.search,
        page: filters.page,
        limit: filters.limit,
      },
      schema: paginated(productSchema),
    }),

  get: (productId: string) =>
    request({ method: 'GET', path: `/products/${productId}`, schema: productSchema }),

  /** 400 when the category is inactive or belongs to another merchant. */
  create: (input: CreateProductInput) =>
    request({ method: 'POST', path: '/products', body: input, schema: productSchema }),

  update: (productId: string, input: UpdateProductInput) =>
    request({ method: 'PUT', path: `/products/${productId}`, body: input, schema: productSchema }),

  deactivate: (productId: string) =>
    request({ method: 'DELETE', path: `/products/${productId}`, schema: noData }),
};
