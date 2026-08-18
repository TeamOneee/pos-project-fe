/**
 * One error type for the whole data layer.
 *
 * Every failure — HTTP status, a `success: false` envelope, a timeout, or a
 * payload that does not match its schema — arrives at the UI as an ApiError
 * with a discriminated `kind`, so screens can branch without inspecting
 * status codes or parsing message strings.
 *
 * Contract §0.1 is deliberate about one thing: the error envelope carries
 * **no `code` field**. The only discriminators a client gets are `statusCode`,
 * `message` (which follows a fixed template per condition), and
 * `errors[].field`. Everything below is built on exactly those three.
 */

import { parseMoneyOr } from '@/lib/money';

/** Shape of the contract's error envelope (§0). */
export type ApiErrorEnvelope = {
  success: false;
  statusCode: number;
  path?: string;
  message: string;
  errors?: unknown;
  timestamp?: string;
};

export type ApiErrorKind =
  | 'validation' // 400
  | 'unauthorized' // 401 — token missing, expired, rejected, or bad credentials
  | 'forbidden' // 403 — role or tenant gating
  | 'not_found' // 404 — also stands in for "belongs to another merchant"
  | 'conflict' // 409 — see ConflictCondition below
  | 'rate_limited' // 429 — login throttle, checkout throttle
  | 'unavailable' // 503 — a core dependency is unhealthy
  | 'server' // 5xx
  | 'timeout' // request aborted by our own deadline
  | 'network' // transport never reached the server
  | 'parse' // response did not match the contract
  | 'unknown';

/** A per-field validation message, as returned by the contract's `errors[]`. */
export type FieldError = { field: string; message: string };

/**
 * The named 409 conditions from §0.1.
 *
 * They share a status code, so the `message` template is the only thing that
 * separates them. Matching on server copy is not something to do lightly, but
 * §0.1 states these templates normatively and offers nothing else — the
 * alternative would be treating every conflict identically, which would leave
 * the cashier without a stock or price frame at checkout.
 */
export type ConflictCondition =
  | 'EMAIL_ALREADY_REGISTERED'
  | 'PRODUCT_INACTIVE'
  | 'CATEGORY_INACTIVE'
  | 'PRICE_CHANGED'
  | 'INSUFFICIENT_STOCK'
  | 'IDEMPOTENCY_CONFLICT'
  | 'UNKNOWN_CONFLICT';

const CONFLICT_MESSAGES: { condition: ConflictCondition; pattern: RegExp }[] = [
  { condition: 'EMAIL_ALREADY_REGISTERED', pattern: /email sudah terdaftar/i },
  { condition: 'CATEGORY_INACTIVE', pattern: /kategori produk tidak aktif/i },
  { condition: 'PRODUCT_INACTIVE', pattern: /produk tidak aktif/i },
  { condition: 'PRICE_CHANGED', pattern: /harga produk berubah/i },
  { condition: 'INSUFFICIENT_STOCK', pattern: /stok tidak mencukupi/i },
  { condition: 'IDEMPOTENCY_CONFLICT', pattern: /konflik idempotency/i },
];

/**
 * A fault the server pinned to one line of the checkout we submitted.
 *
 * §5.2 reports these as `errors[].field = "items[0].product_id"` — an index
 * into the array *we sent*, not a product id. The caller resolves it back to a
 * product through its own request, which it still has.
 */
export type CheckoutItemFault = {
  /** Index into the submitted `items` array; null when the field is unindexed. */
  itemIndex: number | null;
  field: string;
};

/** §5.2 `PRICE_CHANGED`: `message` reads `current_price=9000.00`. */
export type PriceChangedDetail = CheckoutItemFault & {
  /** Integer rupiah — parsed at the boundary like every other money field. */
  currentPrice: number;
};

/** §5.2 `INSUFFICIENT_STOCK`: `message` reads `stock=0, requested=1`. */
export type InsufficientStockDetail = CheckoutItemFault & {
  available: number;
  requested: number;
};

function kindForStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 429:
      return 'rate_limited';
    case 503:
      return 'unavailable';
    default:
      if (status >= 500) return 'server';
      return 'unknown';
  }
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly path: string | undefined;
  /** Raw `errors[]` from the envelope, untouched. Use the helpers below to read it. */
  readonly details: unknown;
  override readonly cause: unknown;

  constructor(init: {
    kind: ApiErrorKind;
    status: number;
    message: string;
    path?: string | undefined;
    details?: unknown;
    cause?: unknown;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.path = init.path;
    this.details = init.details;
    this.cause = init.cause;
  }

  static fromEnvelope(envelope: ApiErrorEnvelope, fallbackStatus: number): ApiError {
    const status = envelope.statusCode || fallbackStatus;
    return new ApiError({
      kind: kindForStatus(status),
      status,
      message: envelope.message,
      path: envelope.path,
      details: envelope.errors,
    });
  }

  static timeout(path: string, timeoutMs: number): ApiError {
    return new ApiError({
      kind: 'timeout',
      status: 0,
      message: `Permintaan melebihi batas waktu ${Math.round(timeoutMs / 1000)} detik`,
      path,
    });
  }

  static network(path: string, cause: unknown): ApiError {
    return new ApiError({
      kind: 'network',
      status: 0,
      message: 'Tidak dapat terhubung ke server',
      path,
      cause,
    });
  }

  /**
   * The response reached us but did not match the contract. This is a bug on
   * one side of the boundary, never a user-facing condition — it fails loudly
   * rather than letting `undefined` render on a screen.
   */
  static parse(path: string, cause: unknown): ApiError {
    return new ApiError({
      kind: 'parse',
      status: 0,
      message: `Respons ${path} tidak sesuai kontrak API`,
      path,
      cause,
    });
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isApiErrorOfKind(error: unknown, ...kinds: ApiErrorKind[]): boolean {
  return isApiError(error) && kinds.includes(error.kind);
}

/** True when the session is gone and the user has to sign in again. */
export function isUnauthorized(error: unknown): boolean {
  return isApiErrorOfKind(error, 'unauthorized');
}

/** True when the role is not allowed here — the router shows the 403 screen. */
export function isForbidden(error: unknown): boolean {
  return isApiErrorOfKind(error, 'forbidden');
}

/** §0.1 `RATE_LIMITED`: login is capped at 5/minute, checkout per user. */
export function isRateLimited(error: unknown): boolean {
  return isApiErrorOfKind(error, 'rate_limited');
}

/* -------------------------------------------------------------------------- */
/* Conflict conditions                                                         */
/* -------------------------------------------------------------------------- */

/** Which named §0.1 condition a 409 is, read from its message template. */
export function conflictCondition(error: unknown): ConflictCondition | null {
  if (!isApiErrorOfKind(error, 'conflict')) return null;
  if (!isApiError(error)) return null;

  const match = CONFLICT_MESSAGES.find((entry) => entry.pattern.test(error.message));
  return match?.condition ?? 'UNKNOWN_CONFLICT';
}

/* -------------------------------------------------------------------------- */
/* errors[] readers                                                            */
/* -------------------------------------------------------------------------- */

function detailArray(error: unknown): unknown[] {
  return isApiError(error) && Array.isArray(error.details) ? error.details : [];
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Field-level messages for a 400, ready to merge into react-hook-form. */
export function fieldErrors(error: unknown): FieldError[] {
  return detailArray(error)
    .filter(isRecord)
    .filter((entry) => typeof entry.field === 'string')
    .map((entry) => ({ field: readString(entry, 'field'), message: readString(entry, 'message') }));
}

/** `"items[3].product_id"` → 3. Anything unindexed yields null. */
function itemIndexOf(field: string): number | null {
  const match = /items\[(\d+)\]/.exec(field);
  if (!match?.[1]) return null;

  const index = Number(match[1]);
  return Number.isInteger(index) ? index : null;
}

/**
 * Stock shortfalls behind a 409, so the cart can show which line failed and by
 * how much rather than a generic toast.
 *
 * The numbers live inside the message text (`stock=0, requested=1`) — §5.2
 * gives no structured field for them.
 */
export function insufficientStockDetails(error: unknown): InsufficientStockDetail[] {
  if (conflictCondition(error) !== 'INSUFFICIENT_STOCK') return [];

  return fieldErrors(error).map((entry) => ({
    field: entry.field,
    itemIndex: itemIndexOf(entry.field),
    available: readTaggedNumber(entry.message, 'stock'),
    requested: readTaggedNumber(entry.message, 'requested'),
  }));
}

export function isInsufficientStock(error: unknown): boolean {
  return conflictCondition(error) === 'INSUFFICIENT_STOCK';
}

/**
 * Price drift behind a 409 at checkout. The cashier has to see the old and new
 * price side by side before the sale can go through — the old price comes from
 * the cart, since the server only reports the current one.
 */
export function priceChangedDetails(error: unknown): PriceChangedDetail[] {
  if (conflictCondition(error) !== 'PRICE_CHANGED') return [];

  return fieldErrors(error).map((entry) => ({
    field: entry.field,
    itemIndex: itemIndexOf(entry.field),
    currentPrice: readTaggedMoney(entry.message, 'current_price'),
  }));
}

export function isPriceChanged(error: unknown): boolean {
  return conflictCondition(error) === 'PRICE_CHANGED';
}

/** True for the 409 raised when an email is already registered. */
export function isDuplicateEmail(error: unknown): boolean {
  if (conflictCondition(error) === 'EMAIL_ALREADY_REGISTERED') return true;
  return isApiErrorOfKind(error, 'conflict') && fieldErrors(error).some((e) => e.field === 'email');
}

/**
 * A product or its category was deactivated between loading the catalogue and
 * confirming the sale. Both read the same way to the cashier: the line has to
 * come out of the cart.
 */
export function isItemUnavailable(error: unknown): boolean {
  const condition = conflictCondition(error);
  return condition === 'PRODUCT_INACTIVE' || condition === 'CATEGORY_INACTIVE';
}

/**
 * §5.2: the same `checkout_request_id` arrived with a different payload. This
 * is a client bug — a key was reused across two genuinely different sales.
 */
export function isIdempotencyConflict(error: unknown): boolean {
  return conflictCondition(error) === 'IDEMPOTENCY_CONFLICT';
}

/* -------------------------------------------------------------------------- */
/* Message parsing                                                             */
/* -------------------------------------------------------------------------- */

/** Pulls `name=123` out of a diagnostic message. Missing or malformed reads 0. */
function readTaggedNumber(message: string, name: string): number {
  const match = new RegExp(`${name}\\s*=\\s*(-?\\d+)`).exec(message);
  return match?.[1] ? Number(match[1]) : 0;
}

/**
 * Same, for a decimal-string amount. Parsed defensively: a malformed figure in
 * a diagnostic must not mask the error it is describing.
 */
function readTaggedMoney(message: string, name: string): number {
  const match = new RegExp(`${name}\\s*=\\s*(-?[\\d.]+)`).exec(message);
  return match?.[1] ? parseMoneyOr(match[1], 0) : 0;
}
