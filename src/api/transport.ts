/** The seam between mock and live. */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | undefined | null;

export type ApiRequest = {
  method: HttpMethod;
  /** Path relative to the API root, with a leading slash: "/products". */
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /**
   * Contract §0: the client may propagate its own trace id via `X-Correlation-Id`; the server
   * generates one when we do not.
   */
  correlationId?: string | undefined;
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
