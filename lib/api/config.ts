/**
 * API configuration.
 *
 * EXPO_PUBLIC_* variables are inlined by Metro at build time, so they must be
 * referenced as full literal member expressions — never `process.env[key]`.
 *
 * Switching EXPO_PUBLIC_API_MODE between "mock" and "live" swaps the transport
 * only. Schemas, domain clients, query hooks and error handling are identical
 * in both modes; live mode points the same requests at EXPO_PUBLIC_API_URL.
 */

export type ApiMode = 'mock' | 'live';

function readMode(): ApiMode {
  return process.env.EXPO_PUBLIC_API_MODE === 'live' ? 'live' : 'mock';
}

function readNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const API_CONFIG = {
  /** "mock" serves the in-memory IndoMart dataset; "live" talks to the backend. */
  mode: readMode(),

  /** Only consulted in live mode. */
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',

  /** Abort a request after this long. Surfaces as an ApiError of kind "timeout". */
  timeoutMs: readNumber(process.env.EXPO_PUBLIC_API_TIMEOUT_MS, 15_000),

  /** Artificial latency in mock mode, so loading states are actually visible. */
  mockLatencyMs: readNumber(process.env.EXPO_PUBLIC_MOCK_LATENCY_MS, 220),
} as const;

export function isMockMode(): boolean {
  return API_CONFIG.mode === 'mock';
}
