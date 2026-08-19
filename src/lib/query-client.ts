import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query owns all server state (CLAUDE.md § Stack). Zustand is for cart
 * state only, and never mirrors anything the API already knows.
 *
 * Cache strategy, per query, in the hook that owns it:
 *   • Reference data (merchant, categories, outlets, staff) — minutes, because
 *     it changes rarely and every write invalidates it.
 *   • Catalog and inventory lists — seconds to a minute, invalidated on write.
 *   • POS catalogue — short, because stock moves with every sale.
 *   • Dashboard reads — 30 minutes (see use-dashboard.ts); freshness after a
 *     change comes from mutation invalidation, not from time.
 *   • Completed-sale reads (transaction detail, receipt, exact search) —
 *     Infinity: a settled sale never changes.
 *
 * The global default below is the floor for everything not explicitly tuned,
 * and the invalidation web on the write hooks is what makes the longer
 * staleTimes safe: products/categories/outlets/staff/inventory/checkout all
 * invalidate every query derived from what they changed.
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
  /** Claims decoded from the access token — there is no `GET /auth/me` (§1.2). */
  session: ['session'] as const,
  merchant: ['merchant'] as const,

  outlets: (filters?: Record<string, unknown>) =>
    filters ? (['outlets', 'list', filters] as const) : (['outlets'] as const),

  staff: (filters?: Record<string, unknown>) =>
    filters ? (['staff', 'list', filters] as const) : (['staff'] as const),

  categories: (filters?: Record<string, unknown>) =>
    filters ? (['categories', 'list', filters] as const) : (['categories'] as const),

  products: (filters?: Record<string, unknown>) =>
    filters ? (['products', 'list', filters] as const) : (['products'] as const),

  /** The cashier catalogue (§4.2) — scoped per outlet, distinct from products. */
  catalog: (filters?: Record<string, unknown>) =>
    filters ? (['catalog', 'list', filters] as const) : (['catalog'] as const),

  inventory: (filters?: Record<string, unknown>) =>
    filters ? (['inventory', 'list', filters] as const) : (['inventory'] as const),
  movements: (filters?: Record<string, unknown>) =>
    filters
      ? (['inventory', 'movements', filters] as const)
      : (['inventory', 'movements'] as const),

  transactions: (filters?: Record<string, unknown>) =>
    filters ? (['transactions', 'list', filters] as const) : (['transactions'] as const),
  transaction: (id: string) => ['transactions', 'detail', id] as const,
  receipt: (id: string) => ['transactions', 'receipt', id] as const,

  /**
   * One key per `/dashboard/*` endpoint. The previous single fat owner/admin
   * endpoints are gone (§6.2), so a screen composes several of these and each
   * caches on its own period.
   */
  dashboard: ['dashboard'] as const,
  dashboardSummary: (params: Record<string, unknown>) => ['dashboard', 'summary', params] as const,
  dashboardOperations: (outletId?: string) =>
    ['dashboard', 'operations', outletId ?? 'all'] as const,
  salesTrend: (params: Record<string, unknown>) => ['dashboard', 'sales-trend', params] as const,
  aovTrend: (params: Record<string, unknown>) => ['dashboard', 'aov-trend', params] as const,
  timePattern: (params: Record<string, unknown>) => ['dashboard', 'time-pattern', params] as const,
  topProducts: (params: Record<string, unknown>) => ['dashboard', 'top-products', params] as const,
  outletComparison: (params: Record<string, unknown>) =>
    ['dashboard', 'outlet-comparison', params] as const,
  lowStock: (outletId?: string) => ['dashboard', 'low-stock', outletId ?? 'all'] as const,

  insights: ['insights'] as const,
} as const;
