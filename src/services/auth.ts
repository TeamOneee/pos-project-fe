/**
 * Auth module — contract §4.1.
 *
 * Register creates the merchant and its first OWNER in one call; every other
 * user is created by the Owner through the user module.
 */

import { z } from 'zod';

import { request } from '@/api/client';
import { id, isoDateTime, noData, roleSchema, statusSchema } from '@/api/schema';

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A user as every endpoint returns it. Update responses echo only the changed
 * fields, so everything but the identity is optional and normalised to null.
 */
export const userSchema = z
  .object({
    user_id: id,
    merchant_id: id.optional(),
    outlet_id: id.nullable().optional(),
    name: z.string(),
    email: z.string(),
    role: roleSchema,
    status: statusSchema,
    created_at: isoDateTime.optional(),
    updated_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    userId: value.user_id,
    merchantId: value.merchant_id ?? null,
    /** Null for OWNER and ADMIN; a CASHIER is always bound to one outlet. */
    outletId: value.outlet_id ?? null,
    name: value.name,
    email: value.email,
    role: value.role,
    status: value.status,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
  }));

export type User = z.infer<typeof userSchema>;

export const merchantSchema = z
  .object({
    merchant_id: id,
    name: z.string(),
    low_stock_threshold: z.number(),
    created_at: isoDateTime.optional(),
    updated_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    merchantId: value.merchant_id,
    name: value.name,
    /** Stock at or below this counts as low across every outlet. */
    lowStockThreshold: value.low_stock_threshold,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
  }));

export type Merchant = z.infer<typeof merchantSchema>;

const loginResultSchema = z
  .object({ access_token: z.string(), user: userSchema })
  .transform((value) => ({ accessToken: value.access_token, user: value.user }));

const registerResultSchema = z
  .object({ merchant: merchantSchema, user: userSchema, access_token: z.string() })
  .transform((value) => ({
    merchant: value.merchant,
    user: value.user,
    accessToken: value.access_token,
  }));

export type LoginResult = z.infer<typeof loginResultSchema>;
export type RegisterResult = z.infer<typeof registerResultSchema>;

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

export type LoginInput = { email: string; password: string };

export type RegisterInput = {
  merchant: { name: string };
  user: { name: string; email: string; password: string };
};

export const authApi = {
  /** 401 when the credentials do not match. */
  login: (input: LoginInput) =>
    request({ method: 'POST', path: '/auth/login', body: input, schema: loginResultSchema }),

  /** 409 when the email is already registered. */
  register: (input: RegisterInput) =>
    request({ method: 'POST', path: '/auth/register', body: input, schema: registerResultSchema }),

  logout: () => request({ method: 'POST', path: '/auth/logout', schema: noData }),

  me: () => request({ method: 'GET', path: '/auth/me', schema: userSchema }),
};
