/**
 * The Owner dashboard, composed.
 *
 * §6.2 replaced one fat `/dashboard/owner` payload with seven granular reads,
 * and this is where they are put back together into the shape S-03 renders.
 * Keeping the composition in a hook rather than in the screen means the cards
 * stay presentational and the fan-out is testable on its own.
 *
 * Two things the contract does not provide, assembled here from things it does:
 *
 *   • **Period-over-period deltas.** There is no comparison endpoint, so the
 *     previous period is a second `/dashboard/summary` read over the range
 *     immediately before this one, and the deltas are a subtraction.
 *   • **Recent sales.** The dashboard endpoints report aggregates only, so the
 *     last few transactions come from `GET /transactions` itself.
 *
 * Freshness is reported by the server rather than guessed from fetch time:
 * every aggregate carries `data_updated_at` and a `FRESH`/`STALE` flag (§6.1),
 * and a STALE read is still a 200 to be rendered with a caveat.
 */

import * as React from 'react';

import {
  useAovTrend,
  useDashboardOperations,
  useDashboardSummary,
  useOutletComparison,
  useSalesTrend,
  useTimePattern,
  useTopProducts,
} from '@/hooks/use-dashboard';
import { useCategories } from '@/hooks/use-categories';
import { useInsights } from '@/hooks/use-insights';
import { useMerchant } from '@/hooks/use-merchant';
import { useOutlets } from '@/hooks/use-outlets';
import { useStaff } from '@/hooks/use-staff';
import { useTransactions } from '@/hooks/use-transactions';
import { bucketFor, growthPercent, previousRange, rangeFor, type Period } from '@/lib/period';
import type { Freshness } from '@/api/schema';

/** How many sales the "Transaksi Terakhir" card lists. */
const RECENT_LIMIT = 5;

export type PeriodDeltas = {
  /** Null when the previous period had nothing to compare against. */
  omzet: number | null;
  transactions: number | null;
  averageTransactionValue: number | null;
};

export function useOwnerDashboard(period: Period, outletId: string | null) {
  // Recomputed only when the chip changes, so the query keys stay stable
  // between renders and the aggregates are not refetched on every tick.
  const range = React.useMemo(() => rangeFor(period), [period]);
  const previous = React.useMemo(() => previousRange(range), [range]);

  const outletFilter = outletId ? { outlet_id: outletId } : {};
  const periodQuery = { ...range, ...outletFilter };
  const bucket = bucketFor(period);

  const summary = useDashboardSummary(periodQuery);
  const previousSummary = useDashboardSummary({ ...previous, ...outletFilter });
  const salesTrend = useSalesTrend({ ...periodQuery, bucket });
  const aovTrend = useAovTrend({ ...periodQuery, bucket });
  const timePattern = useTimePattern(periodQuery);
  const topProducts = useTopProducts({ ...periodQuery, limit: 5 });
  // Merchant-wide by design: comparing outlets to each other has no outlet filter.
  const outletComparison = useOutletComparison(range);

  // The "Ringkasan Merchant" card, which is about the business rather than the
  // period, so none of these take a range.
  const merchant = useMerchant();
  const operations = useDashboardOperations();
  const outlets = useOutlets({ status: 'ACTIVE' });
  const staff = useStaff({ status: 'ACTIVE' });
  const categories = useCategories();
  const insights = useInsights();

  const recent = useTransactions({ ...range, ...outletFilter, size: RECENT_LIMIT });

  /**
   * Memoised, and not as an optimisation.
   *
   * The dashboard feeds these straight into the shell's top-bar slot, which is
   * an effect. A fresh array or object on every render would change that
   * effect's dependencies on every render, and the effect writes state — so the
   * screen would re-render itself forever.
   */
  const outletOptions = React.useMemo(
    () =>
      (outlets.data?.items ?? []).map((outlet) => ({
        outletId: outlet.outletId,
        name: outlet.name,
      })),
    [outlets.data]
  );

  const merchantOverview = React.useMemo(
    () => ({
      merchantName: merchant.data?.name ?? '',
      activeOutlets: outlets.data?.total ?? 0,
      activeStaff: staff.data?.total ?? 0,
      activeProducts: operations.data?.activeProductCount ?? 0,
      totalCategories: categories.data?.total ?? 0,
      /** Null until the merchant has ever run one; §7.2 answers 404 in that case. */
      lastAiAnalysis: insights.data?.analysisJob.updatedAt ?? null,
    }),
    [merchant.data, outlets.data, staff.data, operations.data, categories.data, insights.data]
  );

  const recentTransactions = React.useMemo(() => recent.data?.items ?? [], [recent.data]);

  const deltas = React.useMemo<PeriodDeltas>(() => {
    const current = summary.data;
    const before = previousSummary.data;
    if (!current || !before)
      return { omzet: null, transactions: null, averageTransactionValue: null };

    return {
      omzet: growthPercent(current.omzet, before.omzet),
      transactions: growthPercent(current.transactionCount, before.transactionCount),
      averageTransactionValue: growthPercent(
        current.averageTransactionValue,
        before.averageTransactionValue
      ),
    };
  }, [summary.data, previousSummary.data]);

  /**
   * The oldest `data_updated_at` across the aggregates on screen, so the
   * caption is honest about the least fresh figure rather than the most.
   */
  const dataUpdatedAt = React.useMemo(() => {
    const stamps = [
      summary.data?.meta.dataUpdatedAt,
      salesTrend.data?.meta.dataUpdatedAt,
      aovTrend.data?.meta.dataUpdatedAt,
      timePattern.data?.meta.dataUpdatedAt,
      topProducts.data?.meta.dataUpdatedAt,
      outletComparison.data?.meta.dataUpdatedAt,
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => Date.parse(value))
      .filter((value) => Number.isFinite(value));

    return stamps.length > 0 ? Math.min(...stamps) : 0;
  }, [
    summary.data,
    salesTrend.data,
    aovTrend.data,
    timePattern.data,
    topProducts.data,
    outletComparison.data,
  ]);

  /** STALE anywhere makes the whole surface stale — the caption must not lie. */
  const freshness: Freshness = [
    summary.data?.meta.freshness,
    salesTrend.data?.meta.freshness,
    aovTrend.data?.meta.freshness,
    timePattern.data?.meta.freshness,
    topProducts.data?.meta.freshness,
    outletComparison.data?.meta.freshness,
  ].includes('STALE')
    ? 'STALE'
    : 'FRESH';

  const core = [summary, salesTrend, aovTrend, timePattern, topProducts, outletComparison];

  const refetch = React.useCallback(() => {
    for (const query of core) void query.refetch();
    void previousSummary.refetch();
    void recent.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, outletId]);

  return {
    range,
    previousRange: previous,
    deltas,
    dataUpdatedAt,
    freshness,

    summary: summary.data ?? null,
    previousSummary: previousSummary.data ?? null,
    salesTrend: salesTrend.data ?? null,
    aovTrend: aovTrend.data ?? null,
    timePattern: timePattern.data ?? null,
    topProducts: topProducts.data ?? null,
    outletComparison: outletComparison.data ?? null,
    recentTransactions,
    merchantOverview,
    outletOptions,

    // opt: progressive rendering — outer skeleton only blocks on summary (KPI), other cards render progressively
    isPending: summary.isPending,
    isFetching: core.some((query) => query.isFetching),
    isError: summary.isError,
    summaryError: summary.error,
    // per-card states for granular error UI
    salesTrendPending: salesTrend.isPending,
    salesTrendError: salesTrend.isError,
    salesTrendErrorDetail: salesTrend.error,
    aovTrendPending: aovTrend.isPending,
    aovTrendError: aovTrend.isError,
    timePatternPending: timePattern.isPending,
    timePatternError: timePattern.isError,
    topProductsPending: topProducts.isPending,
    topProductsError: topProducts.isError,
    outletComparisonPending: outletComparison.isPending,
    outletComparisonError: outletComparison.isError,
    refetch,
  };
}

export type OwnerDashboardData = ReturnType<typeof useOwnerDashboard>;
