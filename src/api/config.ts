/**
 * API configuration.
 *
 * VITE_* variables are inlined by Vite at build time, so they must be
 * referenced as full literal member expressions — never `import.meta.env[key]`.
 *
 * Switching VITE_API_MODE between "mock" and "live" swaps the transport
 * only. Schemas, domain clients, query hooks and error handling are identical
 * in both modes; live mode points the same requests at VITE_API_URL.
 */

export type ApiMode = 'mock' | 'live';

function readMode(): ApiMode {
  return import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock';
}

function readNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const API_CONFIG = {
  /** "mock" serves the in-memory IndoMart dataset; "live" talks to the backend. */
  mode: readMode(),

  /** Only consulted in live mode. */
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',

  /** Abort a request after this long. Surfaces as an ApiError of kind "timeout". */
  timeoutMs: readNumber(import.meta.env.VITE_API_TIMEOUT_MS, 15_000),

  /** Artificial latency in mock mode, so loading states are actually visible. */
  mockLatencyMs: readNumber(import.meta.env.VITE_MOCK_LATENCY_MS, 220),
} as const;

export function isMockMode(): boolean {
  return API_CONFIG.mode === 'mock';
}
