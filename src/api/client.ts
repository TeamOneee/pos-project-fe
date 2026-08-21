/** The request pipeline every domain client goes through. */

import type { z } from 'zod';

import { API_CONFIG } from '@/api/config';
import { ApiError, type ApiErrorEnvelope } from '@/api/errors';
import { httpTransport } from '@/api/http';
import type { ApiRequest, Transport } from '@/api/transport';
import { reportUnauthorized } from '@/api/unauthorized';

let installed: Transport | null = null;

/** Swaps the transport. Called once at startup for mock mode; tests use it too. */
export function setTransport(transport: Transport | null): void {
  installed = transport;
}

export function activeTransport(): Transport {
  return installed ?? httpTransport;
}

export type RequestSpec<TSchema extends z.ZodTypeAny> = ApiRequest & {
  /** Schema for the envelope's `data` block. The return type is inferred from it. */
  schema: TSchema;
  /** Overrides the global deadline; tests use a short one. */
  timeoutMs?: number;
};

export type ApiResult<T> = {
  data: T;
  /** HTTP status. Checkout reads it to tell a new sale (201) from a replay (200). */
  status: number;
  message: string;
};

/** Perform a request and return the validated payload along with its status. */
export async function requestWithStatus<TSchema extends z.ZodTypeAny>(
  spec: RequestSpec<TSchema>
): Promise<ApiResult<z.infer<TSchema>>> {
  const { schema, timeoutMs = API_CONFIG.timeoutMs, ...request } = spec;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // An externally supplied signal (React Query cancellation) still wins.
  const unlink = linkSignals(request.signal, controller);

  let raw;
  try {
    raw = await activeTransport()({ ...request, signal: controller.signal });
  } catch (error) {
    if (isAbort(error)) {
      // Our own deadline fired, as opposed to the caller cancelling.
      if (controller.signal.aborted && !request.signal?.aborted) {
        throw ApiError.timeout(request.path, timeoutMs);
      }
      throw error;
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.network(request.path, error);
  } finally {
    clearTimeout(timer);
    unlink();
  }

  const envelope = asEnvelope(raw.body);

  if (raw.status >= 400 || envelope?.success === false) {
    // An authenticated request that came back unauthorized means the session is gone; the auth
    // provider turns this into the expired-session modal.
    if (raw.status === 401) reportUnauthorized(request.path);

    throw ApiError.fromEnvelope(
      {
        success: false,
        statusCode: typeof envelope?.statusCode === 'number' ? envelope.statusCode : raw.status,
        message:
          typeof envelope?.message === 'string' ? envelope.message : fallbackMessage(raw.status),
        path: request.path,
        errors: envelope?.errors,
      } satisfies ApiErrorEnvelope,
      raw.status
    );
  }

  // Contract §0: `204 No Content` is the one success that carries neither a body nor an envelope.
  if (raw.status === 204) {
    const empty = schema.safeParse(null);
    if (!empty.success) throw ApiError.parse(request.path, empty.error);
    return { data: empty.data, status: raw.status, message: '' };
  }

  if (!envelope || envelope.success !== true) {
    throw ApiError.parse(request.path, raw.body);
  }

  const parsed = schema.safeParse(envelope.data);
  if (!parsed.success) {
    throw ApiError.parse(request.path, parsed.error);
  }

  return {
    data: parsed.data,
    status: raw.status,
    message: typeof envelope.message === 'string' ? envelope.message : '',
  };
}

/** The usual path: validated payload, status discarded. */
export async function request<TSchema extends z.ZodTypeAny>(
  spec: RequestSpec<TSchema>
): Promise<z.infer<TSchema>> {
  const result = await requestWithStatus(spec);
  return result.data;
}

type LooseEnvelope = {
  success?: unknown;
  statusCode?: unknown;
  message?: unknown;
  data?: unknown;
  errors?: unknown;
};

function asEnvelope(body: unknown): LooseEnvelope | null {
  if (typeof body !== 'object' || body === null) return null;
  return body as LooseEnvelope;
}

function fallbackMessage(status: number): string {
  if (status >= 500) return 'Terjadi kesalahan pada server';
  if (status === 404) return 'Data tidak ditemukan';
  return 'Permintaan gagal';
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Forward an upstream cancellation into our own controller. */
function linkSignals(source: AbortSignal | undefined, controller: AbortController): () => void {
  if (!source) return () => {};
  if (source.aborted) {
    controller.abort();
    return () => {};
  }

  const forward = () => controller.abort();
  source.addEventListener('abort', forward);
  return () => source.removeEventListener('abort', forward);
}
