/** The three tiles above S-21's table. */

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { TransactionTotals } from '@/lib/transaction-scope';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

export function SummaryStrip({
  summary,
  windowSize,
  loading = false,
}: {
  summary: TransactionTotals;
  /** How many rows the revenue was summed over, for the capped caption. */
  windowSize: number;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-row flex-wrap gap-lg">
        <Tile label="Total Transaksi" value={loading ? '…' : formatCount(summary.count)} />
        <Tile label="Total Pendapatan" value={loading ? '…' : formatIDR(summary.revenue)} />
        <Tile label="Rata-rata / Transaksi" value={loading ? '…' : formatIDR(summary.average)} />
      </div>

      {summary.capped && !loading && (
        <Text variant="caption" tone="subtle">
          {`Pendapatan dihitung dari ${formatCount(windowSize)} transaksi terbaru yang cocok dengan filter.`}
        </Text>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="min-w-[160px] flex-1 basis-full tablet:basis-0">
      <CardContent className="flex flex-col gap-xs pt-lg">
        <Text variant="label" tone="muted">
          {label}
        </Text>
        <Text variant="h2" className="block truncate tabular-nums">
          {value}
        </Text>
      </CardContent>
    </Card>
  );
}
