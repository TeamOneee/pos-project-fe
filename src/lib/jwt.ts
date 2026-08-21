/** Reading the session out of the access token. */

import { roleSchema, type Role } from '@/api/schema';

export type TokenClaims = {
  userId: string;
  merchantId: string;
  role: Role;
  /** A UUID for CASHIER, null for OWNER and ADMIN (§1.2). */
  outletId: string | null;
  /** Seconds since epoch, when the token was issued with an `exp` claim. */
  expiresAt: number | null;
};

/** Decode a JWT payload, or null when the token is unreadable. */
export function decodeToken(token: string | null): TokenClaims | null {
  if (!token) return null;

  const payload = decodePayload(token);
  if (!payload) return null;

  const role = roleSchema.safeParse(payload.role);
  if (!role.success) return null;

  const userId = asString(payload.sub);
  const merchantId = asString(payload.merchant_id);
  if (!userId || !merchantId) return null;

  return {
    userId,
    merchantId,
    role: role.data,
    outletId: asString(payload.outlet_id) || null,
    expiresAt: typeof payload.exp === 'number' ? payload.exp : null,
  };
}

/** True once the token's own `exp` has passed, so boot can skip a certain 401. */
export function isTokenExpired(claims: TokenClaims | null, now: number = Date.now()): boolean {
  if (!claims || claims.expiresAt === null) return false;
  return claims.expiresAt * 1000 <= now;
}

type RawClaims = {
  sub?: unknown;
  merchant_id?: unknown;
  role?: unknown;
  outlet_id?: unknown;
  exp?: unknown;
};

function decodePayload(token: string): RawClaims | null {
  const segment = token.split('.')[1];
  if (!segment) return null;

  try {
    const json = atob(base64UrlToBase64(segment));

    // atob yields one byte per character; the claims may hold non-ASCII (a staff name in a future
    // claim), so decode the byte string as UTF-8.
    const bytes = Uint8Array.from(json, (character) => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);

    const parsed: unknown = JSON.parse(decoded);
    return typeof parsed === 'object' && parsed !== null ? (parsed as RawClaims) : null;
  } catch {
    return null;
  }
}

function base64UrlToBase64(segment: string): string {
  const normalised = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalised.length % 4;
  return padding === 0 ? normalised : normalised + '='.repeat(4 - padding);
}

function asString(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : '';
}
