/** S-03 · Owner business dashboard. */

import * as React from 'react';

import { useTopBarActions } from '@/components/layouts/shell-context';
import { CHART_HEIGHT } from '@/components/pages/charts/chart-frame';
import {
  AovTrendCard,
  RecentTransactionsCard,
} from '@/components/pages/dashboard/aov-recent-cards';
import {
  DashboardEmpty,
  DashboardLoadFailure,
  DashboardSkeleton,
} from '@/components/pages/dashboard/dashboard-states';
import { KpiRow } from '@/components/pages/dashboard/kpi-row';
import { MerchantSummaryCard } from '@/components/pages/dashboard/merchant-summary-card';
import { OutletPerformanceCard } from '@/components/pages/dashboard/outlet-performance-card';
import { PeriodComparisonCard } from '@/components/pages/dashboard/period-comparison-card';
import { TopProductsCard, UnderperformingCard } from '@/components/pages/dashboard/products-cards';
import { SalesTrendCard } from '@/components/pages/dashboard/sales-trend-card';
import { TimePatternCard } from '@/components/pages/dashboard/time-pattern-card';
import { useOwnerDashboard } from '@/hooks/use-owner-dashboard';
import { FreshnessCaption, OutletSelect } from '@/components/pages/owner/controls';
import { PeriodControl } from '@/components/pages/owner/period-control';
import { DEFAULT_SELECTION, type PeriodSelection } from '@/lib/period';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export default function OwnerDashboardPage() {
  const mobile = useBreakpoint() === 'mobile';
  const [selection, setSelection] = React.useState<PeriodSelection>(DEFAULT_SELECTION);
  const [outletId, setOutletId] = React.useState<string | null>(null);

  const dashboard = useOwnerDashboard(selection, outletId);

  const chartHeight = mobile ? CHART_HEIGHT.mobile : CHART_HEIGHT.default;
  const { outletOptions, refetch, isFetching, dataUpdatedAt, freshness } = dashboard;

  // Memoized so useTopBarActions sees a stable node: the top bar slot is fed through an effect, and
  // a fresh element each render would loop the update.
  const controls = React.useMemo(
    () => (
      <div className="flex flex-row items-center gap-md">
        <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />
        <PeriodControl value={selection} onChange={setSelection} />
        <FreshnessCaption
          updatedAt={dataUpdatedAt}
          stale={freshness === 'STALE'}
          refreshing={isFetching}
          onRefresh={refetch}
        />
      </div>
    ),
    [outletOptions, outletId, selection, dataUpdatedAt, freshness, isFetching, refetch]
  );

  useTopBarActions(!mobile ? controls : null);

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      {mobile && (
        <div className="flex flex-col gap-md">
          <div className="flex flex-col gap-md">
            <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />
            <FreshnessCaption
              updatedAt={dataUpdatedAt}
              stale={freshness === 'STALE'}
              refreshing={isFetching}
              onRefresh={refetch}
            />
          </div>
          <PeriodControl value={selection} onChange={setSelection} />
        </div>
      )}

      {dashboard.isPending ? (
        <DashboardSkeleton chartHeight={chartHeight} />
      ) : dashboard.isError || !dashboard.summary ? (
        <DashboardLoadFailure />
      ) : (
        <DashboardBody dashboard={dashboard} chartHeight={chartHeight} compact={mobile} />
      )}
      {/* per-card inline errors render inside DashboardBody, outer no longer blanks on one slow aggregate */}
    </div>
  );
}

function DashboardBody({
  dashboard,
  chartHeight,
  compact,
}: {
  dashboard: ReturnType<typeof useOwnerDashboard>;
  chartHeight: number;
  compact: boolean;
}) {
  const summary = dashboard.summary;
  if (!summary) return null;

  const noSales = summary.transactionCount === 0;

  return (
    <div className="flex flex-col gap-lg">
      <KpiRow summary={summary} deltas={dashboard.deltas} />

      {noSales ? (
        <DashboardEmpty />
      ) : (
        <>
          <div className="flex flex-col gap-lg desktop:flex-row">
            {dashboard.salesTrend ? (
              <SalesTrendCard
                trend={dashboard.salesTrend}
                height={chartHeight}
                compact={compact}
                className="desktop:w-[66%]"
              />
            ) : dashboard.salesTrendError ? (
              <div className="desktop:w-[66%] rounded-lg border border-dashed p-lg text-center text-sm text-muted-foreground">
                Gagal memuat tren penjualan
              </div>
            ) : null}
            <MerchantSummaryCard overview={dashboard.merchantOverview} className="desktop:flex-1" />
          </div>

          <div className="flex flex-col gap-lg desktop:flex-row">
            {dashboard.outletComparison ? (
              <OutletPerformanceCard
                outlets={dashboard.outletComparison.items}
                className="desktop:w-[58%]"
              />
            ) : dashboard.outletComparisonError ? (
              <div className="desktop:w-[58%] rounded-lg border border-dashed p-lg text-center text-sm text-muted-foreground">
                Gagal memuat perbandingan outlet
              </div>
            ) : (
              <OutletPerformanceCard outlets={[]} className="desktop:w-[58%]" />
            )}
            {dashboard.timePattern ? (
              <TimePatternCard
                pattern={dashboard.timePattern}
                height={chartHeight}
                compact={compact}
                className="desktop:flex-1"
              />
            ) : dashboard.timePatternError ? (
              <div className="desktop:flex-1 rounded-lg border border-dashed p-lg text-center text-sm text-muted-foreground">
                Gagal memuat pola waktu
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-lg desktop:flex-row">
            {dashboard.topProducts ? (
              <>
                <TopProductsCard
                  products={dashboard.topProducts.topSelling}
                  className="desktop:flex-1"
                />
                <UnderperformingCard
                  products={dashboard.topProducts.leastSelling}
                  className="desktop:flex-1"
                />
              </>
            ) : dashboard.topProductsError ? (
              <div className="flex-1 rounded-lg border border-dashed p-lg text-center text-sm text-muted-foreground">
                Gagal memuat peringkat produk
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-lg desktop:flex-row">
            {dashboard.aovTrend ? (
              <AovTrendCard
                trend={dashboard.aovTrend}
                delta={dashboard.deltas.averageTransactionValue}
                height={chartHeight}
                className="desktop:flex-1"
              />
            ) : dashboard.aovTrendError ? (
              <div className="desktop:flex-1 rounded-lg border border-dashed p-lg text-center text-sm text-muted-foreground">
                Gagal memuat tren AOV
              </div>
            ) : null}
            <RecentTransactionsCard
              transactions={dashboard.recentTransactions}
              className="desktop:flex-1"
            />
          </div>

          <PeriodComparisonCard
            current={summary}
            previous={dashboard.previousSummary}
            currentRange={dashboard.range}
            previousRange={dashboard.previousRange}
            deltas={dashboard.deltas}
          />
        </>
      )}
    </div>
  );
}
