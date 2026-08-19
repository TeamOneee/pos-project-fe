/**
 * S-14 row 1 — four operational tiles.
 *
 * These are not the Owner's financial KPIs and they do not carry a growth
 * delta: nobody wants to know that "stok habis" is up 12% on last month, they
 * want to know it is three and which three. So the two alarm tiles are
 * shortcuts — each is a button that scrolls to the table listing exactly the
 * products it is counting.
 *
 * All four come from `GET /dashboard/operations` (§6.2), which is deliberately
 * revenue-free. There is no "Total Stok" tile because the endpoint reports no
 * unit total — only how many product/outlet rows exist.
 */

import { KpiTile } from '@/components/pages/dashboard/kpi-tile';
import type { DashboardOperations } from '@/services/dashboard';
import { formatCount } from '@/lib/number';

export function StockKpiRow({
  summary,
  onShowLowStock,
  onShowOutOfStock,
}: {
  summary: DashboardOperations;
  onShowLowStock: () => void;
  onShowOutOfStock: () => void;
}) {
  return (
    <div className="flex flex-row flex-wrap gap-lg">
      <KpiTile label="Produk Aktif" value={formatCount(summary.activeProductCount)} />
      <KpiTile
        label="Produk Berstok"
        value={formatCount(summary.inventoryItemCount)}
        hint="Kombinasi produk & outlet"
      />
      <KpiTile
        label="Stok Menipis"
        value={formatCount(summary.lowStockItemCount)}
        onPress={onShowLowStock}
        hint="Lihat daftar"
      />
      <KpiTile
        label="Stok Habis"
        value={formatCount(summary.outOfStockItemCount)}
        onPress={onShowOutOfStock}
        hint="Lihat daftar"
      />
    </div>
  );
}
