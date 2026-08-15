/**
 * Row 5 — the AOV trend, and the last few sales.
 */

import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { AovLineChart } from '@/features/charts/aov-line-chart';
import { ChartFrame } from '@/features/charts/chart-frame';
import { DeltaChip } from '@/features/owner/delta-chip';
import type { OwnerDashboard } from '@/lib/api/domains/dashboard';
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

      <CardContent className="gap-md">
        <View className="flex-row items-center gap-md">
          <Text variant="mono" className="type-display" numberOfLines={1}>
            {formatIDR(trend.currentAov)}
          </Text>
          <DeltaChip value={trend.growthPercentage} label="AOV" />
        </View>

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

      <CardContent className="gap-md">
        {transactions.map((transaction) => (
          <View key={transaction.transactionId} className="flex-row items-center gap-md">
            <View className="min-w-0 flex-1 gap-xs">
              <Text variant="mono" tone="accent" className="type-body-strong" numberOfLines={1}>
                {transaction.transactionNumber}
              </Text>
              <Text variant="caption" tone="subtle" numberOfLines={1}>
                {transaction.outletName} · {transaction.cashierName}
              </Text>
            </View>

            <View className="items-end gap-xs">
              <Text variant="mono" className="type-body-strong">
                {formatIDR(transaction.total)}
              </Text>
              <Text variant="caption" tone="subtle" numberOfLines={1}>
                {formatRelativeDateTime(transaction.createdAt)}
              </Text>
            </View>
          </View>
        ))}

        <Separator />

        <Link href="/transactions" asChild>
          <Pressable role="link" className="min-h-touch justify-center active:opacity-70">
            <Text variant="body-strong" tone="accent">
              Lihat semua transaksi →
            </Text>
          </Pressable>
        </Link>
      </CardContent>
    </Card>
  );
}
