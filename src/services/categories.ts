/**
 * Category module — contract §3.2.
 *
 * Categories are soft-deactivated and never deleted: §3.2 states there is no
 * `DELETE /categories/:id` in the contract at all (BR-019). Retiring one is
 * `PATCH` with `is_active: false`.
 *
 * Deactivating a category does not touch the products inside it, but those
 * products drop out of the cashier catalogue and checkout rejects them with
 * `CATEGORY_INACTIVE` until the category is active again.
 */

import { z } from 'zod';

import { request } from '@/api/client';
import { id, paginated, type Page } from '@/api/schema';

/**
 * §3.4 `CategoryDto`.
 *
 * Activation is the boolean `is_active`, not the `ACTIVE`/`INACTIVE` enum that
 * merchant, outlet and staff use — the contract is not uniform here, and this
 * is the catalog module's spelling.
 */
export const categorySchema = z
  .object({
    id,
    merchant_id: id.optional(),
    name: z.string(),
    is_active: z.boolean(),
  })
  .transform((value) => ({
    categoryId: value.id,
    merchantId: value.merchant_id ?? null,
    name: value.name,
    isActive: value.is_active,
  }));

export type Category = z.infer<typeof categorySchema>;

/** §3.2: a CASHIER is forced to `is_active=true` in the service, not by query. */
export type CategoryFilters = { is_active?: boolean; page?: number; size?: number };

export type CreateCategoryInput = { name: string };
export type UpdateCategoryInput = { name?: string; is_active?: boolean };

export const categoriesApi = {
  /** Readable by every role; Owner and Admin also see inactive categories. */
  list: (filters: CategoryFilters = {}): Promise<Page<Category>> =>
    request({
      method: 'GET',
      path: '/categories',
      query: { is_active: filters.is_active, page: filters.page, size: filters.size },
      schema: paginated(categorySchema),
    }),

  /** 409 when the name already exists in this merchant (DR-010). */
  create: (input: CreateCategoryInput) =>
    request({ method: 'POST', path: '/categories', body: input, schema: categorySchema }),

  update: (categoryId: string, input: UpdateCategoryInput) =>
    request({
      method: 'PATCH',
      path: `/categories/${categoryId}`,
      body: input,
      schema: categorySchema,
    }),

  deactivate: (categoryId: string) =>
    request({
      method: 'PATCH',
      path: `/categories/${categoryId}`,
      body: { is_active: false },
      schema: categorySchema,
    }),
};
