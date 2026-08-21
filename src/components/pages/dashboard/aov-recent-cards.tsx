/** Row 5 — the AOV trend, and the last few sales. */

import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { AovLineChart } from '@/components/pages/charts/aov-line-chart';
import { ChartFigure } from '@/components/pages/charts/chart-figure';
import { ChartFrame } from '@/components/pages/charts/chart-frame';
import { DeltaChip } from '@/components/pages/owner/delta-chip';
import { bucketLabel } from '@/components/pages/dashboard/sales-trend-card';
import type { AovTrend } from '@/services/dashboard';
import type { TransactionSummary } from '@/services/transactions';
import { formatRelativeDateTime } from '@/lib/date';
import { formatIDR } from '@/lib/money';

export function AovTrendCard({
  trend,
  delta,
  height,
  className,
}: {
  trend: AovTrend;
  /** Period-over-period change, or null when there is no baseline. */
  delta: number | null;
  height: number;
  className?: string;
}) {
  const points = trend.points.map((point) => ({
    label: bucketLabel(point.bucketStart, trend.bucket),
    aov: point.averageTransactionValue,
  }));

  // The headline is the most recent bucket; §6.2 sends no summary figure.
  const currentAov = points.at(-1)?.aov ?? 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Tren AOV</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-md">
        <div className="flex flex-row items-center gap-md">
          <Text variant="display" className="min-w-0 flex-1 truncate tabular-nums">
            {formatIDR(currentAov)}
          </Text>
          {delta === null ? (
            <Text variant="caption" tone="subtle">
              Baru
            </Text>
          ) : (
            <DeltaChip value={delta} label="AOV" />
          )}
        </div>

        <ChartFigure
          summary={`Tren nilai rata-rata transaksi, ${points.length} periode. Terakhir ${formatIDR(
            currentAov
          )}.`}
          rowLabels={points.map((point) => point.label)}
          series={[{ label: 'AOV', values: points.map((point) => formatIDR(point.aov)) }]}
        >
          <ChartFrame height={height}>
            {(width) => <AovLineChart points={points} width={width} height={height} />}
          </ChartFrame>
        </ChartFigure>
      </CardContent>
    </Card>
  );
}

export function RecentTransactionsCard({
  transactions,
  className,
}: {
  transactions: TransactionSummary[];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Transaksi Terbaru</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-md">
        {transactions.length === 0 ? (
          <Text variant="body" tone="muted">
            Belum ada transaksi pada periode ini.
          </Text>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.transactionId} className="flex flex-row items-center gap-md">
              <div className="flex min-w-0 flex-1 flex-col gap-xs">
                <Text variant="body-strong" tone="accent" className="truncate tabular-nums">
                  {transaction.transactionNumber}
                </Text>
                <Text variant="caption" tone="subtle" className="truncate">
                  {transaction.operatorName}
                </Text>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-xs">
                <Text variant="body-strong" className="tabular-nums">
                  {formatIDR(transaction.total)}
                </Text>
                <Text variant="caption" tone="subtle">
                  {formatRelativeDateTime(transaction.createdAt)}
                </Text>
              </div>
            </div>
          ))
        )}

        <Separator />

        <Link
          to="/transactions"
          className="flex min-h-touch items-center outline-none hover:text-accent-hover focus-ring"
        >
          <Text variant="body-strong" tone="accent">
            Lihat semua transaksi →
          </Text>
        </Link>
      </CardContent>
    </Card>
  );
}
