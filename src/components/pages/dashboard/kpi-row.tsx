/** Row 1 — the figures the Owner opens the app for. */

import { KpiTile } from '@/components/pages/dashboard/kpi-tile';
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
