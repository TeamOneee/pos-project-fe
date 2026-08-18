/**
 * Identity module — contract §1.
 *
 * Register creates the merchant and its first OWNER in one atomic call; every
 * other account is created by the Owner through the staff module (§1.2).
 *
 * Three things this module deliberately does **not** have, because §1.2 says
 * the MVP does not:
 *
 *   • `GET /auth/me` — the session is read from the token's claims instead
 *     (see lib/jwt.ts).
 *   • `POST /auth/refresh` — one 900-second token, no renewal.
 *   • `POST /auth/logout` — logout is deleting the token client-side. There is
 *     no server-side revocation or blacklist, so a signed-out token stays
 *     technically valid until it expires.
 */

import { z } from 'zod';

import { request } from '@/api/client';
import { id, roleSchema, statusSchema } from '@/api/schema';

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * §1.4 `StaffDto`. This is the only user shape the API returns, and it comes
 * from the staff endpoints — never from login.
 */
export const staffSchema = z
  .object({
    user_id: id,
    merchant_id: id.optional(),
    outlet_id: id.nullable().optional(),
    name: z.string(),
    email: z.string(),
    role: roleSchema,
    status: statusSchema,
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
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

export type Staff = z.infer<typeof staffSchema>;

/**
 * §1.4 `AuthTokens` — everything login gives back.
 *
 * Note what is absent: no name, no email, no user object. The signed-in
 * person's display name is not available from any endpoint in this contract,
 * so screens must not expect one.
 */
const loginResultSchema = z
  .object({
    access_token: z.string(),
    expires_in: z.number(),
    role: roleSchema,
    merchant_id: id,
    outlet_id: id.nullable(),
  })
  .transform((value) => ({
    accessToken: value.access_token,
    /** Seconds. §1.2 fixes this at 900 and offers no way to extend it. */
    expiresIn: value.expires_in,
    role: value.role,
    merchantId: value.merchant_id,
    outletId: value.outlet_id,
  }));

/**
 * §1.2 register response. It returns no token — the new Owner is sent to the
 * login screen rather than being signed in directly.
 */
const registerResultSchema = z
  .object({
    user_id: id,
    merchant_id: id,
    email: z.string(),
    role: roleSchema,
  })
  .transform((value) => ({
    userId: value.user_id,
    merchantId: value.merchant_id,
    email: value.email,
    role: value.role,
  }));

export type LoginResult = z.infer<typeof loginResultSchema>;
export type RegisterResult = z.infer<typeof registerResultSchema>;

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

export type LoginInput = { email: string; password: string };

/** §1.2: a flat body, not the nested `{ merchant, user }` shape. */
export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  merchant_name: string;
};

export const authApi = {
  /**
   * 401 for bad credentials *and* for a deactivated account — §1.6 requires the
   * two to be indistinguishable, so the UI must not try to tell them apart.
   * 429 once past 5 attempts a minute for an email/IP pair.
   */
  login: (input: LoginInput) =>
    request({ method: 'POST', path: '/auth/login', body: input, schema: loginResultSchema }),

  /** 201 on success, 409 when the email is already registered. */
  register: (input: RegisterInput) =>
    request({ method: 'POST', path: '/auth/register', body: input, schema: registerResultSchema }),
};
