/**
 * Row 5 — the AOV trend, and the last few sales.
 */

import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { AovLineChart } from '@/components/pages/charts/aov-line-chart';
import { ChartFrame } from '@/components/pages/charts/chart-frame';
import { DeltaChip } from '@/components/pages/owner/delta-chip';
import type { OwnerDashboard } from '@/services/dashboard';
import { formatRelativeDateTime } from '@/lib/date';
import { formatIDR } from '@/lib/money';

export function AovTrendCard({
  trend,
  height,
  className,
}: {
  trend: OwnerDashboard['aovTrend'];
  height: number;
  className?: string;
}) {
  const points = trend.labels.map((label, index) => ({
    label,
    aov: trend.values[index] ?? 0,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Tren AOV</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-md">
        <div className="flex flex-row items-center gap-md">
          <Text variant="display" className="min-w-0 flex-1 truncate tabular-nums">
            {formatIDR(trend.currentAov)}
          </Text>
          <DeltaChip value={trend.growthPercentage} label="AOV" />
        </div>

        <ChartFrame height={height}>
          {(width) => <AovLineChart points={points} width={width} height={height} />}
        </ChartFrame>
      </CardContent>
    </Card>
  );
}

export function RecentTransactionsCard({
  transactions,
  className,
}: {
  transactions: OwnerDashboard['recentTransactions'];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Transaksi Terbaru</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-md">
        {transactions.map((transaction) => (
          <div key={transaction.transactionId} className="flex flex-row items-center gap-md">
            <div className="flex min-w-0 flex-1 flex-col gap-xs">
              <Text variant="body-strong" tone="accent" className="truncate tabular-nums">
                {transaction.transactionNumber}
              </Text>
              <Text variant="caption" tone="subtle" className="truncate">
                {transaction.outletName} · {transaction.cashierName}
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
        ))}

        <Separator />

        <Link
          to="/transactions"
          className="flex min-h-touch items-center outline-none hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Text variant="body-strong" tone="accent">
            Lihat semua transaksi →
          </Text>
        </Link>
      </CardContent>
    </Card>
  );
}
