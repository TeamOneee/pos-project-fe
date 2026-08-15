/** Owner-only business dashboard (S-03). RouteGuard returns 403 for Admin. */

import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { TopBarActions } from '@/components/shell/shell-context';
import { Text } from '@/components/ui/text';
import { CHART_HEIGHT } from '@/features/charts/chart-frame';
import { AovTrendCard, RecentTransactionsCard } from '@/features/dashboard/aov-recent-cards';
import { DashboardEmpty, DashboardSkeleton } from '@/features/dashboard/dashboard-states';
import { KpiRow } from '@/features/dashboard/kpi-row';
import { MerchantSummaryCard } from '@/features/dashboard/merchant-summary-card';
import { OutletPerformanceCard } from '@/features/dashboard/outlet-performance-card';
import { PeriodComparisonCard } from '@/features/dashboard/period-comparison-card';
import { TopProductsCard, UnderperformingCard } from '@/features/dashboard/products-cards';
import { SalesTrendCard } from '@/features/dashboard/sales-trend-card';
import { TimePatternCard } from '@/features/dashboard/time-pattern-card';
import { FreshnessCaption, OutletSelect, PeriodSegmented } from '@/features/owner/controls';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useOwnerDashboard } from '@/hooks/use-dashboard';
import type { Period } from '@/lib/api/schema';

export default function DashboardScreen() {
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
  const outletOptions =
    dashboard.data?.outletPerformance.map((outlet) => ({
      outletId: outlet.outletId,
      name: outlet.outletName,
    })) ?? [];
  const snapshotUpdatedAt = dashboard.dataUpdatedAt > 0 ? dashboard.dataUpdatedAt - 120_000 : 0;

  const controls = (
    <View className="flex-row items-center gap-md">
      <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />
      <PeriodSegmented value={period} onChange={setPeriod} />
      <FreshnessCaption
        updatedAt={snapshotUpdatedAt}
        refreshing={dashboard.isFetching}
        onRefresh={() => void dashboard.refetch()}
      />
    </View>
  );

  return (
    <>
      {!mobile && <TopBarActions name="dashboard-controls">{controls}</TopBarActions>}

      <ScrollView contentContainerClassName="gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
        {mobile && (
          <View className="gap-md">
            <View className="gap-md">
              <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />
              <FreshnessCaption
                updatedAt={snapshotUpdatedAt}
                refreshing={dashboard.isFetching}
                onRefresh={() => void dashboard.refetch()}
              />
            </View>
            <PeriodSegmented value={period} onChange={setPeriod} />
          </View>
        )}

        {dashboard.isPending ? (
          <DashboardSkeleton chartHeight={chartHeight} />
        ) : dashboard.isError || !dashboard.data ? (
          <LoadFailure />
        ) : (
          <OwnerDashboardBody
            dashboard={dashboard.data}
            chartHeight={chartHeight}
            compact={mobile}
          />
        )}
      </ScrollView>
    </>
  );
}

function OwnerDashboardBody({
  dashboard,
  chartHeight,
  compact,
}: {
  dashboard: NonNullable<ReturnType<typeof useOwnerDashboard>['data']>;
  chartHeight: number;
  compact: boolean;
}) {
  const noSales = dashboard.summary.totalTransactions === 0;

  return (
    <View className="gap-lg">
      <KpiRow dashboard={dashboard} />

      {noSales ? (
        <DashboardEmpty />
      ) : (
        <>
          <View className="gap-lg desktop:flex-row">
            <SalesTrendCard
              trend={dashboard.salesTrend}
              height={chartHeight}
              compact={compact}
              className="desktop:w-[66%]"
            />
            <MerchantSummaryCard overview={dashboard.merchantOverview} className="desktop:flex-1" />
          </View>

          <View className="gap-lg desktop:flex-row">
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
          </View>

          <View className="gap-lg desktop:flex-row">
            <TopProductsCard products={dashboard.topProducts} className="desktop:flex-1" />
            <UnderperformingCard
              products={dashboard.underperformingProducts}
              className="desktop:flex-1"
            />
          </View>

          <View className="gap-lg desktop:flex-row">
            <AovTrendCard
              trend={dashboard.aovTrend}
              height={chartHeight}
              className="desktop:flex-1"
            />
            <RecentTransactionsCard
              transactions={dashboard.recentTransactions}
              className="desktop:flex-1"
            />
          </View>

          <PeriodComparisonCard comparison={dashboard.periodComparison} />
        </>
      )}
    </View>
  );
}

function LoadFailure() {
  return (
    <View className="flex-1 items-center justify-center p-xl">
      <Text variant="body" tone="danger">
        Gagal memuat dashboard.
      </Text>
    </View>
  );
}
