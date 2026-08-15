/**
 * Row 1 — the four figures the Owner opens the app for.
 *
 * Four across at desktop and tablet, a 2×2 grid on mobile. Money is mono so
 * the digits keep a fixed width when a period change swaps the figure.
 *
 * Each tile carries its period-over-period delta from the dashboard payload.
 */

import { View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { DeltaChip } from '@/features/owner/delta-chip';
import type { OwnerDashboard } from '@/lib/api/domains/dashboard';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

export function KpiRow({ dashboard }: { dashboard: OwnerDashboard }) {
  const { summary, periodComparison } = dashboard;

  return (
    <View className="flex-row flex-wrap gap-lg">
      <KpiTile
        label="Total Omzet"
        value={formatIDR(summary.totalRevenue)}
        delta={summary.revenueGrowth}
      />
      <KpiTile
        label="Jumlah Transaksi"
        value={formatCount(summary.totalTransactions)}
        delta={summary.transactionsGrowth}
      />
      <KpiTile
        label="Rata-rata Nilai Transaksi"
        value={formatIDR(summary.averageOrderValue)}
        delta={periodComparison.changes.aovPercentage}
      />
      <KpiTile
        label="Produk Terjual"
        value={formatCount(summary.totalProductsSold)}
        delta={summary.productsSoldGrowth}
      />
    </View>
  );
}

function KpiTile({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    // 2×2 on mobile, four across from tablet up.
    <Card className="min-w-[140px] flex-1 basis-[calc(50%-8px)] tablet:basis-0">
      <CardContent className="gap-sm pt-lg">
        <Text variant="label" tone="muted" numberOfLines={2}>
          {label}
        </Text>

        <Text variant="mono" className="type-h1" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>

        {delta === undefined ? (
          <Text variant="caption" tone="subtle">
            vs periode sebelumnya
          </Text>
        ) : (
          <View className="flex-row items-center gap-sm">
            <DeltaChip value={delta} label={label} />
            <Text variant="caption" tone="subtle" numberOfLines={1} className="min-w-0 flex-1">
              vs periode sebelumnya
            </Text>
          </View>
        )}
      </CardContent>
    </Card>
  );
}
