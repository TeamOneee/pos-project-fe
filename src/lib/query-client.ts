import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query owns all server state (CLAUDE.md § Stack). Zustand is for cart
 * state only, and never mirrors anything the API already knows.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // POS data changes constantly; 30s keeps screens responsive without
        // re-fetching on every focus change.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          // Never retry a 4xx — a 403 from role gating will not become a 200.
          if (isClientError(error)) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Mutations are user-initiated; a silent retry can double-charge a cart.
        retry: false,
      },
    },
  });
}

/** True for HTTP 4xx, which are not worth retrying. */
function isClientError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * Query key factory. Every key starts with its domain, so a mutation can
 * invalidate a whole domain with the bare prefix — invalidating ['products']
 * clears every filtered list and every single-product query under it.
 */
export const queryKeys = {
  session: ['session'] as const,
  merchant: ['merchant'] as const,

  outlets: (filters?: Record<string, unknown>) =>
    filters ? (['outlets', 'list', filters] as const) : (['outlets'] as const),
  outlet: (id: string) => ['outlets', 'detail', id] as const,

  users: (filters?: Record<string, unknown>) =>
    filters ? (['users', 'list', filters] as const) : (['users'] as const),
  user: (id: string) => ['users', 'detail', id] as const,

  categories: ['categories'] as const,

  products: (filters?: Record<string, unknown>) =>
    filters ? (['products', 'list', filters] as const) : (['products'] as const),
  product: (id: string) => ['products', 'detail', id] as const,

  inventory: (filters?: Record<string, unknown>) =>
    filters ? (['inventory', 'list', filters] as const) : (['inventory'] as const),
  inventoryItem: (outletId: string, productId: string) =>
    ['inventory', 'detail', outletId, productId] as const,
  lowStock: (outletId?: string) => ['inventory', 'low-stock', outletId ?? 'all'] as const,

  /** The cashier's server-side cart. One per session. */
  cart: ['cart'] as const,

  transactions: (filters?: Record<string, unknown>) =>
    filters ? (['transactions', 'list', filters] as const) : (['transactions'] as const),
  transaction: (id: string) => ['transactions', 'detail', id] as const,

  dashboard: ['dashboard'] as const,
  /** One key for the whole Owner dashboard — it is a single fat endpoint. */
  dashboardOwner: (params?: Record<string, unknown>) =>
    ['dashboard', 'owner', params ?? {}] as const,
  dashboardAdmin: (outletId?: string) => ['dashboard', 'admin', outletId ?? 'all'] as const,

  analytics: ['analytics'] as const,
  salesTrend: (params: Record<string, unknown>) => ['analytics', 'sales-trend', params] as const,
  timePattern: (params: Record<string, unknown>) => ['analytics', 'time-pattern', params] as const,
  aovTrend: (params: Record<string, unknown>) => ['analytics', 'aov-trend', params] as const,
  productPerformance: (params: Record<string, unknown>) =>
    ['analytics', 'product-performance', params] as const,

  aiInsights: ['ai-insights'] as const,
} as const;
