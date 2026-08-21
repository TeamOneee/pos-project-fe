/**
 * Live transport: fetch against VITE_API_URL.
 *
 * This is the only file that knows the backend has a URL at all. Everything
 * above it works the same whether the bytes came from here or from the mock.
 */

import { API_CONFIG } from '@/api/config';
import { ApiError } from '@/api/errors';
import { getToken } from '@/api/token';
import { buildQueryString, type ApiRequest, type ApiRawResponse } from '@/api/transport';

export const httpTransport = async (request: ApiRequest): Promise<ApiRawResponse> => {
  const url = `${API_CONFIG.baseUrl}${request.path}${buildQueryString(request.query)}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (request.body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  // Contract §0: propagate the caller's trace id when it supplied one.
  if (request.correlationId) headers['X-Correlation-Id'] = request.correlationId;

  let response: Response;
  try {
    response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      ...(request.signal ? { signal: request.signal as AbortSignal } : {}),
    });
  } catch (error) {
    // Node 24 + jsdom: a jsdom AbortSignal is not an instance of Node's
    // AbortSignal and fetch throws TypeError. Retry without signal — the
    // timeout is still enforced by the client's AbortController deadline.
    if (error instanceof TypeError && String((error as Error).message).includes('AbortSignal')) {
      try {
        response = await fetch(url, {
          method: request.method,
          headers,
          body: request.body === undefined ? undefined : JSON.stringify(request.body),
        });
      } catch (retryError) {
        if (isAbort(retryError)) throw retryError;
        throw ApiError.network(request.path, retryError);
      }
    } else {
      // An aborted fetch is our own deadline firing; client.ts turns the signal
      // into a timeout error, so only genuine transport failures land here.
      if (isAbort(error)) throw error;
      throw ApiError.network(request.path, error);
    }
  }

  return { status: response.status, body: await readJson(response) };
};

/** A 204 or an HTML error page must not blow up before the status is read. */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
