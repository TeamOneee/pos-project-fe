/**
 * S-03 · Owner business dashboard.
 *
 * One of the two surfaces behind `/dashboard`; the Admin's operational stock
 * dashboard is the other. The role picks between them in `pages/dashboard`,
 * and the route guard keeps a Cashier out of both.
 */

import * as React from 'react';

import { useTopBarActions } from '@/components/layouts/shell-context';
import { Text } from '@/components/ui/text';
import { CHART_HEIGHT } from '@/components/pages/charts/chart-frame';
import {
  AovTrendCard,
  RecentTransactionsCard,
} from '@/components/pages/dashboard/aov-recent-cards';
import { DashboardEmpty, DashboardSkeleton } from '@/components/pages/dashboard/dashboard-states';
import { KpiRow } from '@/components/pages/dashboard/kpi-row';
import { MerchantSummaryCard } from '@/components/pages/dashboard/merchant-summary-card';
import { OutletPerformanceCard } from '@/components/pages/dashboard/outlet-performance-card';
import { PeriodComparisonCard } from '@/components/pages/dashboard/period-comparison-card';
import { TopProductsCard, UnderperformingCard } from '@/components/pages/dashboard/products-cards';
import { SalesTrendCard } from '@/components/pages/dashboard/sales-trend-card';
import { TimePatternCard } from '@/components/pages/dashboard/time-pattern-card';
import { useOwnerDashboard } from '@/hooks/use-dashboard';
import { FreshnessCaption, OutletSelect, PeriodSegmented } from '@/components/pages/owner/controls';
import type { OwnerDashboard } from '@/services/dashboard';
import type { Period } from '@/api/schema';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export default function OwnerDashboardPage() {
  const mobile = useBreakpoint() === 'mobile';
  const [period, setPeriod] = React.useState<Period>('THIS_MONTH');
  const [outletId, setOutletId] = React.useState<string | null>(null);

  // One fat endpoint and one screen loading state. Filter changes update this
  // key, so selecting a different period or outlet refetches the whole surface.
  const dashboard = useOwnerDashboard({
    period,
    ...(outletId ? { outlet_id: outletId } : {}),
  });

  const chartHeight = mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.default;
  const outletOptions = React.useMemo(
    () =>
      dashboard.data?.outletPerformance.map((outlet) => ({
        outletId: outlet.outletId,
        name: outlet.outletName,
      })) ?? [],
    [dashboard.data]
  );
  const snapshotUpdatedAt = dashboard.dataUpdatedAt > 0 ? dashboard.dataUpdatedAt - 120_000 : 0;
  const { refetch } = dashboard;
  const refreshDashboard = React.useCallback(() => void refetch(), [refetch]);

  // Memoized so useTopBarActions sees a stable node: the top bar slot is fed
  // through an effect, and a fresh element each render would loop the update.
  const controls = React.useMemo(
    () => (
      <div className="flex flex-row items-center gap-md">
        <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />
        <PeriodSegmented value={period} onChange={setPeriod} />
        <FreshnessCaption
          updatedAt={snapshotUpdatedAt}
          refreshing={dashboard.isFetching}
          onRefresh={refreshDashboard}
        />
      </div>
    ),
    [outletOptions, outletId, period, snapshotUpdatedAt, dashboard.isFetching, refreshDashboard]
  );

  useTopBarActions(!mobile ? controls : null);

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      {mobile && (
        <div className="flex flex-col gap-md">
          <div className="flex flex-col gap-md">
            <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />
            <FreshnessCaption
              updatedAt={snapshotUpdatedAt}
              refreshing={dashboard.isFetching}
              onRefresh={() => void dashboard.refetch()}
            />
          </div>
          <PeriodSegmented value={period} onChange={setPeriod} />
        </div>
      )}

      {dashboard.isPending ? (
        <DashboardSkeleton chartHeight={chartHeight} />
      ) : dashboard.isError || !dashboard.data ? (
        <LoadFailure />
      ) : (
        <OwnerDashboardBody dashboard={dashboard.data} chartHeight={chartHeight} compact={mobile} />
      )}
    </div>
  );
}

function OwnerDashboardBody({
  dashboard,
  chartHeight,
  compact,
}: {
  dashboard: OwnerDashboard;
  chartHeight: number;
  compact: boolean;
}) {
  const noSales = dashboard.summary.totalTransactions === 0;

  return (
    <div className="flex flex-col gap-lg">
      <KpiRow dashboard={dashboard} />

      {noSales ? (
        <DashboardEmpty />
      ) : (
        <>
          <div className="flex flex-col gap-lg desktop:flex-row">
            <SalesTrendCard
              trend={dashboard.salesTrend}
              height={chartHeight}
              compact={compact}
              className="desktop:w-[66%]"
            />
            <MerchantSummaryCard overview={dashboard.merchantOverview} className="desktop:flex-1" />
          </div>

          <div className="flex flex-col gap-lg desktop:flex-row">
            <OutletPerformanceCard
              outlets={dashboard.outletPerformance}
              className="desktop:w-[58%]"
            />
            <TimePatternCard
              pattern={dashboard.timePattern}
              height={chartHeight}
              compact={compact}
              className="desktop:flex-1"
            />
          </div>

          <div className="flex flex-col gap-lg desktop:flex-row">
            <TopProductsCard products={dashboard.topProducts} className="desktop:flex-1" />
            <UnderperformingCard
              products={dashboard.underperformingProducts}
              className="desktop:flex-1"
            />
          </div>

          <div className="flex flex-col gap-lg desktop:flex-row">
            <AovTrendCard
              trend={dashboard.aovTrend}
              height={chartHeight}
              className="desktop:flex-1"
            />
            <RecentTransactionsCard
              transactions={dashboard.recentTransactions}
              className="desktop:flex-1"
            />
          </div>

          <PeriodComparisonCard comparison={dashboard.periodComparison} />
        </>
      )}
    </div>
  );
}

function LoadFailure() {
  return (
    <div className="flex flex-1 items-center justify-center p-xl">
      <Text variant="body" tone="danger">
        Gagal memuat dashboard.
      </Text>
    </div>
  );
}
