/**
 * Row 3 left — revenue per outlet, sorted descending.
 *
 * Plain divs rather than a charting library: this is one bar per outlet with a
 * label, a figure and a chip on the same line. A chart component would have to
 * be fought into that shape, and the bar is only there to make the ranking
 * scannable — the numbers beside it are the data.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useChartColors } from '@/lib/chart-colors';
import { DeltaChip } from '@/components/pages/owner/delta-chip';
import type { OwnerDashboard } from '@/services/dashboard';
import { formatIDR } from '@/lib/money';
import { formatPercent } from '@/lib/number';

export function OutletPerformanceCard({
  outlets,
  className,
}: {
  outlets: OwnerDashboard['outletPerformance'];
  className?: string;
}) {
  const colors = useChartColors();

  const sorted = [...outlets].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const highest = sorted[0]?.totalRevenue ?? 1;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performa Outlet</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-lg">
        {sorted.map((outlet) => (
          <div key={outlet.outletId} className="flex flex-col gap-sm">
            <div className="flex flex-row items-center justify-between gap-md">
              <Text variant="body-strong" className="min-w-0 flex-1 truncate">
                {outlet.outletName}
              </Text>
              <Text variant="body-strong" className="shrink-0 tabular-nums">
                {formatIDR(outlet.totalRevenue)}
              </Text>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
              <div
                style={{
                  width: `${Math.max(2, (outlet.totalRevenue / highest) * 100)}%`,
                  backgroundColor: colors.revenue,
                }}
                className="h-full rounded-full"
              />
            </div>

            <div className="flex flex-row items-center gap-sm">
              <Text variant="caption" tone="subtle">
                {formatPercent(outlet.contributionPercentage)} dari total
              </Text>
              <DeltaChip value={outlet.revenueGrowth} label={outlet.outletName} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
