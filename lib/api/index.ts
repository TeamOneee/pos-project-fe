/**
 * Data layer entry point.
 *
 * Importing this module installs the transport that matches
 * EXPO_PUBLIC_API_MODE. Do that once, at app startup, before the first query
 * runs — the root layout imports it for exactly that reason.
 */

import { setTransport } from '@/lib/api/client';
import { API_CONFIG, isMockMode } from '@/lib/api/config';
import { mockTransport } from '@/lib/api/mock/adapter';

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
export { setTransport, request, requestWithStatus } from '@/lib/api/client';
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
} from '@/lib/api/errors';
export { clearToken, getToken, restoreToken, setToken } from '@/lib/api/token';
export type { Page, Period, PaymentMethod, Role, Status, TransactionStatus } from '@/lib/api/schema';

export { authApi, type LoginInput, type RegisterInput, type User } from '@/lib/api/domains/auth';
export { merchantsApi, type Merchant } from '@/lib/api/domains/merchants';
export { outletsApi, type Outlet } from '@/lib/api/domains/outlets';
export { usersApi } from '@/lib/api/domains/users';
export { categoriesApi, type Category } from '@/lib/api/domains/categories';
export { productsApi, type Product } from '@/lib/api/domains/products';
export {
  inventoryApi,
  type InventoryItem,
  type LowStockAlert,
} from '@/lib/api/domains/inventory';
export { cartApi, type Cart, type CartItem } from '@/lib/api/domains/cart';
export {
  transactionsApi,
  type CheckoutResult,
  type Transaction,
  type TransactionDetail,
} from '@/lib/api/domains/transactions';
export {
  dashboardApi,
  type AdminDashboard,
  type OwnerDashboard,
} from '@/lib/api/domains/dashboard';
export { analyticsApi } from '@/lib/api/domains/analytics';
export { aiInsightsApi, type AiInsight } from '@/lib/api/domains/ai-insights';

/** Mock-only helpers. No-ops in live mode; safe to leave in screen code. */
export { clearMockScenario, setMockScenario, type MockScenario } from '@/lib/api/mock/scenarios';
export { resetDb as resetMockDb } from '@/lib/api/mock/db';
