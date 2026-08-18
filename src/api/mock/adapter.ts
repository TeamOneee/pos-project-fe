/**
 * Mock transport.
 *
 * Implements the same Transport interface as the live fetch transport: takes a
 * described request, returns a status and an envelope. Everything above it —
 * schemas, money parsing, error mapping, query hooks — is unchanged.
 */

import { API_CONFIG } from '@/api/config';
import { dispatch, errorEnvelope, MockHttpError, type MockEnvelope } from '@/api/mock/handlers';
import { takeScenarioFor, type MockScenario } from '@/api/mock/scenarios';
import type { ApiRawResponse, ApiRequest, Transport } from '@/api/transport';

export const mockTransport: Transport = async (request: ApiRequest): Promise<ApiRawResponse> => {
  // Latency first, so loading states are exercised and cancellation works.
  await sleep(API_CONFIG.mockLatencyMs, request.signal);

  const scenario = takeScenarioFor(request.path);
  if (scenario) {
    if (scenario === 'timeout') {
      // Hang until the client's own deadline aborts us — the real timeout path.
      await neverResolve(request.signal);
    }
    return toRaw(scenarioResponse(scenario, request.path));
  }

  try {
    return toRaw(
      dispatch(
        request.method,
        request.path,
        stringifyQuery(request.query),
        asBody(request.body)
      )
    );
  } catch (error) {
    if (error instanceof MockHttpError) {
      return toRaw(errorEnvelope(error.status, error.message, request.path, error.errors));
    }
    throw error;
  }
};

function toRaw(envelope: MockEnvelope): ApiRawResponse {
  return { status: envelope.status, body: envelope.body };
}

function stringifyQuery(query: ApiRequest['query']): Record<string, string> {
  const result: Record<string, string> = {};
  if (!query) return result;

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    result[key] = String(value);
  }
  return result;
}

function asBody(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

/** Canned responses for the failures that are awkward to stage on demand. */
function scenarioResponse(scenario: MockScenario, path: string): MockEnvelope {
  switch (scenario) {
    case 'unauthorized':
      return errorEnvelope(401, 'Invalid email or password', path);

    case 'forbidden':
      return errorEnvelope(403, 'You do not have access to this resource', path);

    case 'not_found':
      return errorEnvelope(404, 'Data tidak ditemukan', path);

    case 'duplicate_email':
      return errorEnvelope(409, 'Email already registered', path, [
        { field: 'email', message: 'Email owner@indomart.com is already used' },
      ]);

    case 'insufficient_stock':
      return errorEnvelope(400, 'Insufficient stock for product: Coca Cola 1.5L', path, [
        {
          product_id: 'prd_cc1500',
          product_name: 'Coca Cola 1.5L',
          requested: 5,
          available: 3,
        },
      ]);

    case 'price_changed':
      return errorEnvelope(409, 'Cart validation failed', path, [
        {
          code: 'PRICE_CHANGED',
          product_id: 'prd_cc1500',
          product_name: 'Coca Cola 1.5L',
          cart_price: '15000.00',
          current_price: '18000.00',
        },
      ]);

    case 'server_error':
      return errorEnvelope(500, 'Internal server error', path);

    case 'timeout':
      // Unreachable: handled before this switch.
      return errorEnvelope(504, 'Gateway timeout', path);
  }
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Resolves never; rejects when the request is aborted. */
function neverResolve(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    signal?.addEventListener('abort', () => reject(abortError()), { once: true });
  });
}

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}
