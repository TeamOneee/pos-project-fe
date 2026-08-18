/**
 * Row 1 — the figures the Owner opens the app for.
 *
 * Three tiles, not four. §6.4 `DashboardSummary` reports omzet, transaction
 * count and average transaction value — there is no "produk terjual" total
 * anywhere in the contract, so that tile is gone rather than filled from
 * something adjacent.
 *
 * Each delta is a client-side comparison against a second `/dashboard/summary`
 * read over the preceding period; a null delta means the previous period had no
 * baseline, which reads as "Baru" rather than as a fabricated +100%.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { DeltaChip } from '@/components/pages/owner/delta-chip';
import type { PeriodDeltas } from '@/hooks/use-owner-dashboard';
import type { DashboardSummary } from '@/services/dashboard';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

export function KpiRow({ summary, deltas }: { summary: DashboardSummary; deltas: PeriodDeltas }) {
  return (
    <div className="flex flex-row flex-wrap gap-lg">
      <KpiTile label="Total Omzet" value={formatIDR(summary.omzet)} delta={deltas.omzet} />
      <KpiTile
        label="Jumlah Transaksi"
        value={formatCount(summary.transactionCount)}
        delta={deltas.transactions}
      />
      <KpiTile
        label="Rata-rata Nilai Transaksi"
        value={formatIDR(summary.averageTransactionValue)}
        delta={deltas.averageTransactionValue}
      />
    </div>
  );
}

function KpiTile({ label, value, delta }: { label: string; value: string; delta: number | null }) {
  return (
    // Stacked on mobile, across from tablet up.
    <Card className="min-w-[140px] flex-1 basis-full tablet:basis-0">
      <CardContent className="flex flex-col gap-sm pt-lg">
        <Text variant="label" tone="muted">
          {label}
        </Text>

        <Text variant="h1" className="block truncate tabular-nums">
          {value}
        </Text>

        {delta === null ? (
          <Text variant="caption" tone="subtle">
            Baru
          </Text>
        ) : (
          <DeltaChip value={delta} label={label} />
        )}
      </CardContent>
    </Card>
  );
}
