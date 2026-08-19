/**
 * Dashboards — one hook per `/dashboard/*` endpoint (§6.2).
 *
 * The single fat `/dashboard/owner` and `/dashboard/admin` payloads are gone.
 * A screen now composes the panels it wants, and each panel has its own loading
 * and error state. That is more states to render, but it is also why the Owner
 * dashboard no longer blanks out entirely when one aggregate is slow.
 *
 * Everything Owner-facing needs a period, and §6.2 caps the range at 366 days.
 * The two current-state endpoints — operations and low-stock — take no period
 * at all and are readable by the Admin as well.
 *
 * Caching: the whole dashboard surface is kept for 30 minutes before a query
 * hits the API again, because a dashboard is read for a status check, not for
 * live numbers — and §6.1 rule 3 already caches the aggregates server-side for
 * the same 30 minutes. Freshness after a change is not a matter of time but of
 * invalidation: every stock, product, outlet and checkout write invalidates
 * `['dashboard']` (see use-inventory.ts, use-products.ts, use-checkout.ts), so
 * the screen does hit the API the moment the underlying data actually moved.
 */

import { useQueries, useQuery } from '@tanstack/react-query';

import {
  dashboardApi,
  type OutletQuery,
  type PeriodQuery,
  type TopProductsQuery,
  type TrendQuery,
} from '@/services/dashboard';
import { queryKeys } from '@/lib/query-client';

/** How long a dashboard read stays fresh before the API is asked again. */
const DASHBOARD_STALE_MS = 30 * 60_000;

export function useDashboardSummary(query: PeriodQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.dashboardSummary(query),
    queryFn: () => dashboardApi.summary(query),
    enabled: options.enabled ?? true,
    staleTime: DASHBOARD_STALE_MS,
  });
}

/** The Admin's landing figures. Stock and catalogue counts only — no revenue. */
export function useDashboardOperations(query: OutletQuery = {}) {
  return useQuery({
    queryKey: queryKeys.dashboardOperations(query.outlet_id),
    queryFn: () => dashboardApi.operations(query),
    staleTime: DASHBOARD_STALE_MS,
  });
}

/**
 * Operational counts for several outlets at once, for the "Stok Per Outlet"
 * table (S-14 row 2).
 *
 * §6.2 has no per-outlet breakdown endpoint — `operations` answers for one
 * outlet at a time — so this fans out over the outlets the caller names. That
 * is a handful of small current-state reads, not an aggregation, and each is
 * cached under its own key alongside the single-outlet view.
 */
export function useOperationsByOutlet(outletIds: readonly string[]) {
  return useQueries({
    queries: outletIds.map((outletId) => ({
      queryKey: queryKeys.dashboardOperations(outletId),
      queryFn: () => dashboardApi.operations({ outlet_id: outletId }),
      staleTime: DASHBOARD_STALE_MS,
    })),
  });
}

export function useSalesTrend(query: TrendQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.salesTrend(query),
    queryFn: () => dashboardApi.salesTrend(query),
    enabled: options.enabled ?? true,
    staleTime: DASHBOARD_STALE_MS,
  });
}

export function useAovTrend(query: TrendQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.aovTrend(query),
    queryFn: () => dashboardApi.aovTrend(query),
    enabled: options.enabled ?? true,
    staleTime: DASHBOARD_STALE_MS,
  });
}

export function useTimePattern(query: PeriodQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.timePattern(query),
    queryFn: () => dashboardApi.timePattern(query),
    enabled: options.enabled ?? true,
    staleTime: DASHBOARD_STALE_MS,
  });
}

export function useTopProducts(query: TopProductsQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.topProducts(query),
    queryFn: () => dashboardApi.topProducts(query),
    enabled: options.enabled ?? true,
    staleTime: DASHBOARD_STALE_MS,
  });
}

/** Merchant-wide by design — a comparison has no outlet filter. */
export function useOutletComparison(
  query: Omit<PeriodQuery, 'outlet_id'>,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: queryKeys.outletComparison(query),
    queryFn: () => dashboardApi.outletComparison(query),
    enabled: options.enabled ?? true,
    staleTime: DASHBOARD_STALE_MS,
  });
}

/** Low-stock alerts. Admin and Owner; part of the dashboard surface, so 30 min too. */
export function useLowStock(query: OutletQuery = {}) {
  return useQuery({
    queryKey: queryKeys.lowStock(query.outlet_id),
    queryFn: () => dashboardApi.lowStock(query),
    staleTime: DASHBOARD_STALE_MS,
  });
}
