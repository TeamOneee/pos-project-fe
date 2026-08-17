/**
 * Row 2 left — revenue and transaction count over the period, with the four
 * figures that describe the series underneath.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useChartColors } from '@/lib/chart-colors';
import { ChartFigure } from '@/components/pages/charts/chart-figure';
import { ChartFrame } from '@/components/pages/charts/chart-frame';
import { SalesTrendChart } from '@/components/pages/charts/sales-trend-chart';
import type { OwnerDashboard } from '@/services/dashboard';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

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
      <CardHeader className="flex flex-row items-start justify-between gap-md">
        <CardTitle>Tren Penjualan</CardTitle>
        <Legend />
      </CardHeader>

      <CardContent className="flex flex-col gap-md">
        <ChartFigure
          summary={`Tren penjualan ${points.length} periode. Total omzet ${formatIDR(
            trend.summary.totalRevenue
          )}, tertinggi ${formatIDR(trend.summary.highestRevenue)}, terendah ${formatIDR(
            trend.summary.lowestRevenue
          )}.`}
          rowLabels={points.map((point) => point.label)}
          series={[
            { label: 'Omzet', values: points.map((point) => formatIDR(point.revenue)) },
            {
              label: 'Transaksi',
              values: points.map((point) => formatCount(point.transactions)),
            },
          ]}
        >
          <ChartFrame height={height}>
            {(width) => (
              <SalesTrendChart points={points} width={width} height={height} compact={compact} />
            )}
          </ChartFrame>
        </ChartFigure>

        <div className="flex flex-row flex-wrap gap-md">
          <SummaryFigure label="Tertinggi" value={formatIDR(trend.summary.highestRevenue)} />
          <SummaryFigure label="Terendah" value={formatIDR(trend.summary.lowestRevenue)} />
          <SummaryFigure label="Rata-rata" value={formatIDR(trend.summary.averageRevenue)} />
          <SummaryFigure label="Total" value={formatIDR(trend.summary.totalRevenue)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Legend() {
  const colors = useChartColors();

  return (
    <div className="flex flex-row items-center gap-md">
      <div className="flex flex-row items-center gap-xs">
        <div className="h-1 w-4 rounded-full" style={{ backgroundColor: colors.revenue }} />
        <Text variant="caption" tone="muted">
          Omzet
        </Text>
      </div>
      <div className="flex flex-row items-center gap-xs">
        {/* Dashed, matching the line it labels. */}
        <div className="h-1 w-2 rounded-full" style={{ backgroundColor: colors.transactions }} />
        <div className="h-1 w-1 rounded-full" style={{ backgroundColor: colors.transactions }} />
        <Text variant="caption" tone="muted">
          Transaksi
        </Text>
      </div>
    </div>
  );
}

function SummaryFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[120px] flex-1 flex-col gap-xs">
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Text variant="body-strong" className="block truncate tabular-nums">
        {value}
      </Text>
    </div>
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
