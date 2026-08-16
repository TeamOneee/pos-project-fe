/**
 * Analytics. Owner only — Admin and Cashier have no access.
 *
 * Unlike the Owner dashboard, these are four separate endpoints, so each chart
 * owns its query and refetches on its own filter change.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  analyticsApi,
  type AovTrendParams,
  type ProductPerformanceParams,
  type SalesTrendParams,
  type TimePatternParams,
} from '@/services/analytics';
import { queryKeys } from '@/lib/query-client';

/** Both dates are required; the query stays idle until they are set. */
export function useSalesTrend(params: Partial<SalesTrendParams>) {
  const ready = Boolean(params.start_date && params.end_date);

  return useQuery({
    queryKey: queryKeys.salesTrend(params),
    queryFn: () =>
      analyticsApi.salesTrend({
        ...params,
        start_date: params.start_date ?? '',
        end_date: params.end_date ?? '',
      }),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

export function useTimePattern(params: TimePatternParams = {}) {
  return useQuery({
    queryKey: queryKeys.timePattern(params),
    queryFn: () => analyticsApi.timePattern(params),
    placeholderData: keepPreviousData,
  });
}

export function useAovTrend(params: AovTrendParams = {}) {
  return useQuery({
    queryKey: queryKeys.aovTrend(params),
    queryFn: () => analyticsApi.aovTrend(params),
    placeholderData: keepPreviousData,
  });
}

export function useProductPerformance(params: ProductPerformanceParams = {}) {
  return useQuery({
    queryKey: queryKeys.productPerformance(params),
    queryFn: () => analyticsApi.productPerformance(params),
    placeholderData: keepPreviousData,
  });
}
