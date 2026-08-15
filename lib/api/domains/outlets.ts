/**
 * Outlet module — contract §4.3. Owner only.
 *
 * Delete is a soft delete: the outlet becomes INACTIVE and keeps its history.
 */

import { z } from 'zod';

import { request } from '@/lib/api/client';
import { id, isoDateTime, noData, statusSchema, type Status } from '@/lib/api/schema';

export const outletSchema = z
  .object({
    outlet_id: id,
    merchant_id: id.optional(),
    name: z.string(),
    address: z.string().nullable().optional(),
    status: statusSchema,
    created_at: isoDateTime.optional(),
    updated_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    outletId: value.outlet_id,
    merchantId: value.merchant_id ?? null,
    name: value.name,
    address: value.address ?? null,
    status: value.status,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
  }));

export type Outlet = z.infer<typeof outletSchema>;

export type OutletFilters = { status?: Status };

export type CreateOutletInput = { name: string; address: string; status?: Status };
export type UpdateOutletInput = Partial<CreateOutletInput>;

export const outletsApi = {
  list: (filters: OutletFilters = {}) =>
    request({
      method: 'GET',
      path: '/outlets',
      query: { status: filters.status },
      schema: z.array(outletSchema),
    }),

  get: (outletId: string) =>
    request({ method: 'GET', path: `/outlets/${outletId}`, schema: outletSchema }),

  create: (input: CreateOutletInput) =>
    request({ method: 'POST', path: '/outlets', body: input, schema: outletSchema }),

  update: (outletId: string, input: UpdateOutletInput) =>
    request({ method: 'PUT', path: `/outlets/${outletId}`, body: input, schema: outletSchema }),

  /** Soft delete — the outlet is deactivated, never removed. */
  deactivate: (outletId: string) =>
    request({ method: 'DELETE', path: `/outlets/${outletId}`, schema: noData }),
};
