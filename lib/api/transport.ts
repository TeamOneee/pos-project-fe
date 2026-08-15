/**
 * The seam between mock and live.
 *
 * A transport takes a described request and returns a raw status plus a parsed
 * JSON body — nothing more. Envelope checking, schema validation and error
 * mapping all happen above it in client.ts, so both modes go through exactly
 * the same code once the bytes are in hand.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type QueryValue = string | number | boolean | undefined | null;

export type ApiRequest = {
  method: HttpMethod;
  /** Path relative to the API root, with a leading slash: "/products". */
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Checkout sends this so a repeated request cannot create a second sale. */
  idempotencyKey?: string | undefined;
  signal?: AbortSignal | undefined;
};

export type ApiRawResponse = {
  status: number;
  body: unknown;
};

export type Transport = (request: ApiRequest) => Promise<ApiRawResponse>;

/** Serialise query params, dropping the ones that were never set. */
export function buildQueryString(query: Record<string, QueryValue> | undefined): string {
  if (!query) return '';

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }

  const serialised = params.toString();
  return serialised ? `?${serialised}` : '';
}

/**
 * A stable key for an idempotent request. Identical payloads produce identical
 * keys, which is what makes a repeated checkout return the original sale
 * instead of creating a second one.
 *
 * FNV-1a over the canonical JSON form: short, dependency-free, and collision
 * resistance beyond this is not needed for a per-cashier request window.
 */
export function stableRequestKey(path: string, body: unknown): string {
  const canonical = `${path}:${canonicalJson(body)}`;
  let hash = 0x811c9dc5;

  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    // 32-bit FNV prime multiply, kept in range with Math.imul.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `idem_${hash.toString(16).padStart(8, '0')}`;
}

/** JSON with object keys sorted, so key order cannot change the hash. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`);

  return `{${entries.join(',')}}`;
}
