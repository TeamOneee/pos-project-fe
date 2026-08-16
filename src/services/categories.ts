/**
 * Category module — contract §4.5.
 *
 * `status` is one of the known backend gaps: the contract specifies it, the
 * Prisma schema has no column for it yet. The client type keeps it and the
 * mock serves it; against a live backend it defaults to ACTIVE.
 */

import { z } from 'zod';

import { request } from '@/api/client';
import { gapField, id, isoDateTime, noData, statusSchema } from '@/api/schema';

export const categorySchema = z
  .object({
    category_id: id,
    merchant_id: id.optional(),
    name: z.string(),
    status: gapField(statusSchema, 'ACTIVE'),
    created_at: isoDateTime.optional(),
    updated_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    categoryId: value.category_id,
    merchantId: value.merchant_id ?? null,
    name: value.name,
    status: value.status,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
  }));

export type Category = z.infer<typeof categorySchema>;

export type CreateCategoryInput = { name: string };
export type UpdateCategoryInput = { name: string };

export const categoriesApi = {
  list: () => request({ method: 'GET', path: '/categories', schema: z.array(categorySchema) }),

  create: (input: CreateCategoryInput) =>
    request({ method: 'POST', path: '/categories', body: input, schema: categorySchema }),

  update: (categoryId: string, input: UpdateCategoryInput) =>
    request({
      method: 'PUT',
      path: `/categories/${categoryId}`,
      body: input,
      schema: categorySchema,
    }),

  deactivate: (categoryId: string) =>
    request({ method: 'DELETE', path: `/categories/${categoryId}`, schema: noData }),
};
