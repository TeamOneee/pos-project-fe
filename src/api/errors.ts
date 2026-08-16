/**
 * One error type for the whole data layer.
 *
 * Every failure — HTTP status, a `success: false` envelope, a timeout, or a
 * payload that does not match its schema — arrives at the UI as an ApiError
 * with a discriminated `kind`, so screens can branch without inspecting
 * status codes or parsing message strings.
 */

/** Shape of the contract's error envelope (§3). */
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
  | 'unauthorized' // 401 — token missing, expired or rejected
  | 'forbidden' // 403 — role gating
  | 'not_found' // 404
  | 'conflict' // 409 — duplicate email, price changed, job in progress
  | 'not_implemented' // 501 — endpoints the MVP does not serve
  | 'server' // 5xx
  | 'timeout' // request aborted by our own deadline
  | 'network' // transport never reached the server
  | 'parse' // response did not match the contract
  | 'unknown';

/** A per-field validation message, as returned by the contract's `errors[]`. */
export type FieldError = { field: string; message: string };

/** `errors[]` entry for the insufficient-stock cases (cart, checkout, transfer). */
export type InsufficientStockDetail = {
  productId: string;
  productName: string;
  requested: number;
  available: number;
};

/** `errors[]` entry for the 409 PRICE_CHANGED case at checkout. */
export type PriceChangedDetail = {
  code: 'PRICE_CHANGED';
  productId: string;
  productName: string;
  /** Integer rupiah — parsed at the boundary like every other money field. */
  cartPrice: number;
  currentPrice: number;
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
    case 501:
      return 'not_implemented';
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

function detailArray(error: unknown): unknown[] {
  return isApiError(error) && Array.isArray(error.details) ? error.details : [];
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value : '';
}

function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  return typeof value === 'number' ? value : 0;
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

/**
 * Stock shortfalls behind a 400, so the cart can show which line failed and by
 * how much rather than a generic toast.
 */
export function insufficientStockDetails(error: unknown): InsufficientStockDetail[] {
  if (!isApiErrorOfKind(error, 'validation')) return [];

  return detailArray(error)
    .filter(isRecord)
    .filter((entry) => 'available' in entry && 'product_id' in entry)
    .map((entry) => ({
      productId: readString(entry, 'product_id'),
      productName: readString(entry, 'product_name'),
      requested: readNumber(entry, 'requested'),
      available: readNumber(entry, 'available'),
    }));
}

export function isInsufficientStock(error: unknown): boolean {
  return insufficientStockDetails(error).length > 0;
}

/**
 * Price drift behind a 409 at checkout. The cashier has to see the old and new
 * price side by side before the sale can go through.
 *
 * Money arrives here as decimal strings like every other money field, so it is
 * parsed to integer rupiah on the way out — the UI never sees the raw string.
 */
export function priceChangedDetails(error: unknown): PriceChangedDetail[] {
  if (!isApiErrorOfKind(error, 'conflict')) return [];

  return detailArray(error)
    .filter(isRecord)
    .filter((entry) => entry.code === 'PRICE_CHANGED')
    .map((entry) => ({
      code: 'PRICE_CHANGED' as const,
      productId: readString(entry, 'product_id'),
      productName: readString(entry, 'product_name'),
      cartPrice: parseDetailMoney(entry.cart_price),
      currentPrice: parseDetailMoney(entry.current_price),
    }));
}

export function isPriceChanged(error: unknown): boolean {
  return priceChangedDetails(error).length > 0;
}

/** True for the 409 raised when an email is already registered. */
export function isDuplicateEmail(error: unknown): boolean {
  if (!isApiErrorOfKind(error, 'conflict')) return false;
  if (fieldErrors(error).some((entry) => entry.field === 'email')) return true;
  return isApiError(error) && /email/i.test(error.message);
}

/**
 * Money inside an error payload is parsed defensively: a malformed amount in a
 * diagnostic must not mask the error it is describing.
 */
function parseDetailMoney(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') return 0;
  const digits = String(value).match(/^(-?\d+)(?:\.0*)?$/);
  return digits?.[1] ? Number(digits[1]) : 0;
}
