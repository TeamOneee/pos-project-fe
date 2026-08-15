/**
 * Row 2 left — revenue and transaction count over the period, with the four
 * figures that describe the series underneath.
 */

import { View } from 'react-native';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useChartColors } from '@/features/charts/chart-colors';
import { ChartFrame } from '@/features/charts/chart-frame';
import { SalesTrendChart } from '@/features/charts/sales-trend-chart';
import type { OwnerDashboard } from '@/lib/api/domains/dashboard';
import { formatIDR } from '@/lib/money';
import { cn } from '@/lib/utils';

type SalesTrendCardProps = {
  trend: OwnerDashboard['salesTrend'];
  height: number;
  compact: boolean;
  className?: string;
};

export function SalesTrendCard({ trend, height, compact, className }: SalesTrendCardProps) {
  const points = trend.labels.map((label, index) => ({
    label: shortDate(label),
    revenue: trend.revenue[index] ?? 0,
    transactions: trend.transactions[index] ?? 0,
  }));

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-md">
        <CardTitle>Tren Penjualan</CardTitle>
        <Legend />
      </CardHeader>

      <CardContent className="gap-md">
        <ChartFrame height={height}>
          {(width) => (
            <SalesTrendChart points={points} width={width} height={height} compact={compact} />
          )}
        </ChartFrame>

        <View className="flex-row flex-wrap gap-md">
          <SummaryFigure label="Tertinggi" value={formatIDR(trend.summary.highestRevenue)} />
          <SummaryFigure label="Terendah" value={formatIDR(trend.summary.lowestRevenue)} />
          <SummaryFigure label="Rata-rata" value={formatIDR(trend.summary.averageRevenue)} />
          <SummaryFigure label="Total" value={formatIDR(trend.summary.totalRevenue)} />
        </View>
      </CardContent>
    </Card>
  );
}

function Legend() {
  const colors = useChartColors();

  return (
    <View className="flex-row items-center gap-md">
      <View className="flex-row items-center gap-xs">
        <View className="h-1 w-4 rounded-full" style={{ backgroundColor: colors.revenue }} />
        <Text variant="caption" tone="muted">
          Omzet
        </Text>
      </View>
      <View className="flex-row items-center gap-xs">
        {/* Dashed, matching the line it labels. */}
        <View className="h-1 w-2 rounded-full" style={{ backgroundColor: colors.transactions }} />
        <View className="h-1 w-1 rounded-full" style={{ backgroundColor: colors.transactions }} />
        <Text variant="caption" tone="muted">
          Transaksi
        </Text>
      </View>
    </View>
  );
}

function SummaryFigure({ label, value }: { label: string; value: string }) {
  return (
    <View className={cn('min-w-[120px] flex-1 gap-xs')}>
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Text variant="mono" className="type-body-strong" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** "2026-08-01" → "1 Agu". Axis labels have no room for the year. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function shortDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;

  const month = Number(match[2]) - 1;
  return `${Number(match[3])} ${MONTHS[month] ?? ''}`.trim();
}
