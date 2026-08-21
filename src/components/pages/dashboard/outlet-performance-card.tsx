/** Row 3 left — revenue per outlet, sorted descending. */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useChartColors } from '@/lib/chart-colors';
import type { OutletComparisonItem } from '@/services/dashboard';
import { formatIDR, sumRupiah } from '@/lib/money';
import { formatCount, formatPercent } from '@/lib/number';

export function OutletPerformanceCard({
  outlets,
  className,
}: {
  outlets: OutletComparisonItem[];
  className?: string;
}) {
  const colors = useChartColors();

  const sorted = [...outlets].sort((a, b) => b.omzet - a.omzet);
  const highest = sorted[0]?.omzet ?? 1;
  const total = sumRupiah(sorted.map((outlet) => outlet.omzet));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performa Outlet</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-lg">
        {sorted.length === 0 ? (
          <Text variant="body" tone="muted">
            Belum ada penjualan pada periode ini.
          </Text>
        ) : (
          sorted.map((outlet) => (
            <div key={outlet.outletId} className="flex flex-col gap-sm">
              <div className="flex flex-row items-center justify-between gap-md">
                <Text variant="body-strong" className="min-w-0 flex-1 truncate">
                  {outlet.outletName}
                </Text>
                <Text variant="body-strong" className="shrink-0 tabular-nums">
                  {formatIDR(outlet.omzet)}
                </Text>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
                <div
                  style={{
                    width: `${Math.max(2, (outlet.omzet / (highest || 1)) * 100)}%`,
                    backgroundColor: colors.revenue,
                  }}
                  className="h-full rounded-full"
                />
              </div>

              <div className="flex flex-row items-center gap-sm">
                <Text variant="caption" tone="subtle">
                  {formatPercent(total > 0 ? (outlet.omzet / total) * 100 : 0)} dari total
                </Text>
                <Text variant="caption" tone="subtle">
                  · {formatCount(outlet.transactionCount)} transaksi
                </Text>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
