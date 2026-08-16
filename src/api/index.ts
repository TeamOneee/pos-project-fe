/**
 * Data layer entry point.
 *
 * Importing this module installs the transport that matches VITE_API_MODE.
 * Do that once, at app startup, before the first query runs — the root layout
 * imports it for exactly that reason.
 */

import { setTransport } from '@/api/client';
import { API_CONFIG, isMockMode } from '@/api/config';
import { mockTransport } from '@/api/mock/adapter';

let installed = false;

/** Idempotent: safe to call from anywhere, does its work once. */
export function installApi(): void {
  if (installed) return;
  installed = true;

  // Live mode leaves the default fetch transport in place; only the base URL
  // changes between environments.
  setTransport(isMockMode() ? mockTransport : null);
}

installApi();

export { API_CONFIG, isMockMode };
export { setTransport, request, requestWithStatus } from '@/api/client';
export {
  ApiError,
  fieldErrors,
  insufficientStockDetails,
  isApiError,
  isDuplicateEmail,
  isForbidden,
  isInsufficientStock,
  isPriceChanged,
  isUnauthorized,
  priceChangedDetails,
  type ApiErrorKind,
  type FieldError,
  type InsufficientStockDetail,
  type PriceChangedDetail,
} from '@/api/errors';
export { clearToken, getToken, restoreToken, setToken } from '@/api/token';
export type { Page, Period, PaymentMethod, Role, Status, TransactionStatus } from '@/api/schema';

/** Mock-only helpers. No-ops in live mode; safe to leave in screen code. */
export { clearMockScenario, setMockScenario, type MockScenario } from '@/api/mock/scenarios';
export { resetDb as resetMockDb } from '@/api/mock/db';
