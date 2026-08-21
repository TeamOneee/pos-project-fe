/** Merchant profile — contract §2.2. */

import { z } from 'zod';

import { request } from '@/api/client';
import { id, isoDateTime, statusSchema } from '@/api/schema';

/** §2.4 `MerchantDto`. */
export const merchantSchema = z
  .object({
    id,
    owner_user_id: id.optional(),
    name: z.string(),
    /** Drives every report boundary and time bucket (BR-018). */
    timezone: z.string(),
    status: statusSchema,
    created_at: isoDateTime.optional(),
    updated_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    merchantId: value.id,
    ownerUserId: value.owner_user_id ?? null,
    name: value.name,
    timezone: value.timezone,
    status: value.status,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
  }));

export type Merchant = z.infer<typeof merchantSchema>;

export type UpdateMerchantInput = { name?: string };

export const merchantApi = {
  /** Readable by OWNER, ADMIN and CASHIER alike. */
  get: () => request({ method: 'GET', path: '/merchant', schema: merchantSchema }),

  /** Owner only; 403 for anyone else. */
  update: (input: UpdateMerchantInput) =>
    request({ method: 'PATCH', path: '/merchant', body: input, schema: merchantSchema }),
};
