/**
 * Row 6 — this period against the last, side by side.
 *
 * The three deltas sit between the two blocks rather than inside either, so it
 * is obvious they describe the relationship and not one of the columns.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { DeltaChip } from '@/components/pages/owner/delta-chip';
import type { OwnerDashboard } from '@/services/dashboard';
import { formatDate } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

export function PeriodComparisonCard({
  comparison,
  className,
}: {
  comparison: OwnerDashboard['periodComparison'];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Perbandingan Periode</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-lg desktop:flex-row desktop:items-center">
        <PeriodBlock title="Periode ini" period={comparison.currentPeriod} />

        <div className="flex flex-col gap-sm desktop:px-lg">
          <DeltaChip value={comparison.changes.revenuePercentage} label="Omzet" />
          <DeltaChip value={comparison.changes.transactionsPercentage} label="Transaksi" />
          <DeltaChip value={comparison.changes.aovPercentage} label="AOV" />
        </div>

        <PeriodBlock title="Periode sebelumnya" period={comparison.previousPeriod} muted />
      </CardContent>
    </Card>
  );
}

function PeriodBlock({
  title,
  period,
  muted = false,
}: {
  title: string;
  period: OwnerDashboard['periodComparison']['currentPeriod'];
  muted?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-sm rounded-md bg-subtle p-lg">
      <Text variant="label" tone="muted">
        {title}
      </Text>
      <Text variant="caption" tone="subtle">
        {formatDate(period.startDate)} – {formatDate(period.endDate)}
      </Text>

      <Text variant="h1" tone={muted ? 'muted' : 'default'} className="block truncate tabular-nums">
        {formatIDR(period.totalRevenue)}
      </Text>
      <Text variant="caption" tone="subtle">
        {formatCount(period.totalTransactions)} transaksi
      </Text>
    </div>
  );
}
