/** Outlet module — contract §2.2. */

import { z } from 'zod';

import { request } from '@/api/client';
import { id, isoDateTime, paginated, statusSchema, type Page, type Status } from '@/api/schema';

/** §2.4 `OutletDto`. */
export const outletSchema = z
  .object({
    id,
    merchant_id: id.optional(),
    name: z.string(),
    address: z.string().nullable().optional(),
    status: statusSchema,
    created_at: isoDateTime.optional(),
    updated_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    outletId: value.id,
    merchantId: value.merchant_id ?? null,
    name: value.name,
    address: value.address ?? null,
    status: value.status,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
  }));

export type Outlet = z.infer<typeof outletSchema>;

export type OutletFilters = { status?: Status; page?: number; size?: number };

/** §2.2: an outlet is always born ACTIVE, so status is not a create field. */
export type CreateOutletInput = { name: string; address?: string };

export type UpdateOutletInput = { name?: string; address?: string; status?: Status };

export const outletsApi = {
  list: (filters: OutletFilters = {}): Promise<Page<Outlet>> =>
    request({
      method: 'GET',
      path: '/outlets',
      query: { status: filters.status, page: filters.page, size: filters.size },
      schema: paginated(outletSchema),
    }),

  create: (input: CreateOutletInput) =>
    request({ method: 'POST', path: '/outlets', body: input, schema: outletSchema }),

  update: (outletId: string, input: UpdateOutletInput) =>
    request({ method: 'PATCH', path: `/outlets/${outletId}`, body: input, schema: outletSchema }),

  /** Retirement is a status patch — the outlet and its history are never removed. */
  deactivate: (outletId: string) =>
    request({
      method: 'PATCH',
      path: `/outlets/${outletId}`,
      body: { status: 'INACTIVE' },
      schema: outletSchema,
    }),
};
