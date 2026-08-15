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

/** Query key factory. Every key starts with its domain, so invalidation is cheap. */
export const queryKeys = {
  session: ['session'] as const,
  merchant: ['merchant'] as const,
  outlets: ['outlets'] as const,
  outlet: (id: string) => ['outlets', id] as const,
  users: ['users'] as const,
  categories: ['categories'] as const,
  products: (filters?: Record<string, unknown>) =>
    filters ? (['products', filters] as const) : (['products'] as const),
  product: (id: string) => ['products', id] as const,
  inventory: (outletId?: string) =>
    outletId ? (['inventory', outletId] as const) : (['inventory'] as const),
  lowStock: (outletId?: string) => ['inventory', 'low-stock', outletId ?? 'all'] as const,
  transactions: (filters?: Record<string, unknown>) =>
    filters ? (['transactions', filters] as const) : (['transactions'] as const),
  transaction: (id: string) => ['transactions', id] as const,
  dashboard: (scope: string) => ['dashboard', scope] as const,
  analytics: (range: string) => ['analytics', range] as const,
  aiInsights: ['ai-insights'] as const,
} as const;
