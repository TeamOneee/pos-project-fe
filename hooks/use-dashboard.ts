/**
 * Dashboards.
 *
 * The Owner dashboard is one fat endpoint and gets exactly one query, so the
 * screen has a single loading state and a single error state. Do not add a
 * second query for a widget on that screen — the payload already contains it.
 */

import { useQuery } from '@tanstack/react-query';

import { dashboardApi, type OwnerDashboardParams } from '@/lib/api/domains/dashboard';
import { queryKeys } from '@/lib/query-client';

/** The entire Owner dashboard: summary, trends, outlets, products, insights. */
export function useOwnerDashboard(params: OwnerDashboardParams = {}) {
  return useQuery({
    queryKey: queryKeys.dashboardOwner(params),
    queryFn: () => dashboardApi.owner(params),
  });
}

/** The Admin stock overview. Admin has no business dashboard. */
export function useAdminDashboard(outletId?: string) {
  return useQuery({
    queryKey: queryKeys.dashboardAdmin(outletId),
    queryFn: () => dashboardApi.admin(outletId),
  });
}
