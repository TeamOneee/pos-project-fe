/**
 * Row 6 — this period against the last, side by side.
 *
 * The three deltas sit between the two blocks rather than inside either, so it
 * is obvious they describe the relationship and not one of the columns.
 *
 * There is no comparison endpoint in §6.2. Both columns are `/dashboard/summary`
 * reads — one over the selected period, one over the range immediately before
 * it — and the deltas are computed from the pair. That is why a delta can be
 * null: a merchant with no trading in the earlier window has nothing to be
 * compared against, and "Baru" is the honest thing to show.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { DeltaChip } from '@/components/pages/owner/delta-chip';
import type { PeriodDeltas } from '@/hooks/use-owner-dashboard';
import type { DashboardSummary } from '@/services/dashboard';
import type { DateRange } from '@/lib/period';
import { formatDate } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

export function PeriodComparisonCard({
  current,
  previous,
  currentRange,
  previousRange,
  deltas,
  className,
}: {
  current: DashboardSummary;
  /** Null while the second read is still in flight. */
  previous: DashboardSummary | null;
  currentRange: DateRange;
  previousRange: DateRange;
  deltas: PeriodDeltas;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Perbandingan Periode</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-lg desktop:flex-row desktop:items-center">
        <PeriodBlock title="Periode ini" range={currentRange} summary={current} />

        <div className="flex flex-col gap-sm desktop:px-lg">
          <Delta value={deltas.omzet} label="Omzet" />
          <Delta value={deltas.transactions} label="Transaksi" />
          <Delta value={deltas.averageTransactionValue} label="AOV" />
        </div>

        <PeriodBlock
          title="Periode sebelumnya"
          range={previousRange}
          summary={previous}
          muted
        />
      </CardContent>
    </Card>
  );
}

function Delta({ value, label }: { value: number | null; label: string }) {
  if (value === null) {
    return (
      <Text variant="caption" tone="subtle">
        {`${label}: baru`}
      </Text>
    );
  }

  return <DeltaChip value={value} label={label} />;
}

function PeriodBlock({
  title,
  range,
  summary,
  muted = false,
}: {
  title: string;
  range: DateRange;
  summary: DashboardSummary | null;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-sm rounded-md bg-subtle p-lg">
      <Text variant="label" tone="muted">
        {title}
      </Text>
      <Text variant="caption" tone="subtle">
        {formatDate(range.date_from)} – {formatDate(range.date_to)}
      </Text>

      <Text variant="h1" tone={muted ? 'muted' : 'default'} className="block truncate tabular-nums">
        {summary ? formatIDR(summary.omzet) : '—'}
      </Text>
      <Text variant="caption" tone="subtle">
        {summary ? `${formatCount(summary.transactionCount)} transaksi` : 'Memuat…'}
      </Text>
    </div>
  );
}
