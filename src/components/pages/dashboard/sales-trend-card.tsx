/**
 * Row 2 left — revenue and transaction count over the period, with the four figures that describe
 * the series underneath.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useChartColors } from '@/lib/chart-colors';
import { ChartFigure } from '@/components/pages/charts/chart-figure';
import { ChartFrame } from '@/components/pages/charts/chart-frame';
import { SalesTrendChart } from '@/components/pages/charts/sales-trend-chart';
import type { SalesTrend } from '@/services/dashboard';
import { formatIDR, sumRupiah } from '@/lib/money';
import { formatCount } from '@/lib/number';

type SalesTrendCardProps = {
  trend: SalesTrend;
  height: number;
  compact: boolean;
  className?: string;
};

export function SalesTrendCard({ trend, height, compact, className }: SalesTrendCardProps) {
  const points = trend.points.map((point) => ({
    label: bucketLabel(point.bucketStart, trend.bucket),
    revenue: point.omzet,
    transactions: point.transactionCount,
  }));

  const revenues = points.map((point) => point.revenue);
  const total = sumRupiah(revenues);
  const highest = revenues.length > 0 ? Math.max(...revenues) : 0;
  const lowest = revenues.length > 0 ? Math.min(...revenues) : 0;
  // Truncated, never rounded up into money nobody took.
  const average = revenues.length > 0 ? Math.trunc(total / revenues.length) : 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-md">
        <CardTitle>Tren Penjualan</CardTitle>
        <Legend />
      </CardHeader>

      <CardContent className="flex flex-col gap-md">
        <ChartFigure
          summary={`Tren penjualan ${points.length} periode. Total omzet ${formatIDR(
            total
          )}, tertinggi ${formatIDR(highest)}, terendah ${formatIDR(lowest)}.`}
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
          <SummaryFigure label="Tertinggi" value={formatIDR(highest)} />
          <SummaryFigure label="Terendah" value={formatIDR(lowest)} />
          <SummaryFigure label="Rata-rata" value={formatIDR(average)} />
          <SummaryFigure label="Total" value={formatIDR(total)} />
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** An axis label for a bucket start. */
export function bucketLabel(iso: string, bucket: 'HOUR' | 'DAY'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  if (bucket === 'HOUR') return `${String(date.getHours()).padStart(2, '0')}.00`;
  return `${date.getDate()} ${MONTHS[date.getMonth()] ?? ''}`.trim();
}
