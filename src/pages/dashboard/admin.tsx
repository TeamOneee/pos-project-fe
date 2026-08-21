/**
 * S-14 · Admin stock dashboard — the Admin's landing screen.
 *
 * Contract §6.2 replaced the single `/dashboard/admin` payload with granular
 * endpoints, so this screen composes two reads:
 *
 *   • `GET /dashboard/operations?outlet_id=` per outlet — the per-outlet table.
 *   • `GET /dashboard/operations` — the catalogue reference figures.
 *
 * It reads as a reference screen, not a work queue. The restocking queue and
 * the actions that go with it live on `/inventory/low-stock`, which carries its
 * own nav item; running the same queue here split one job across two screens
 * and gave the Admin two places to check.
 *
 * Everything on the screen is therefore merchant-wide, which is why there is no
 * outlet filter: the per-outlet table spans every active outlet by design, and
 * the catalogue strip counts the whole catalogue. Row-level action stays with
 * the row — "Kelola Stok" opens that outlet in Inventory.
 *
 * The Admin has no analytics, no AI insight and no transaction history: the
 * role matrix closes all three, and nothing on this screen links to them.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { Text } from '@/components/ui/text';
import { CatalogueStrip } from '@/components/pages/admin-dashboard/catalogue-strip';
import {
  OutletStockTable,
  type OutletStats,
} from '@/components/pages/admin-dashboard/outlet-stock-table';
import {
  DashboardLoadFailure,
  StockDashboardSkeleton,
} from '@/components/pages/dashboard/dashboard-states';
import { useDashboardOperations, useOperationsByOutlet } from '@/hooks/use-dashboard';
import { useOutlets } from '@/hooks/use-outlets';

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  // Unscoped: these are the merchant's figures, not one outlet's.
  const operations = useDashboardOperations();
  const outlets = useOutlets({ status: 'ACTIVE' });

  const outletOptions = React.useMemo(
    () =>
      (outlets.data?.items ?? []).map((outlet) => ({
        outletId: outlet.outletId,
        name: outlet.name,
      })),
    [outlets.data]
  );

  const outletIds = React.useMemo(
    () => outletOptions.map((outlet) => outlet.outletId),
    [outletOptions]
  );
  const perOutlet = useOperationsByOutlet(outletIds);

  const outletRows = React.useMemo<OutletStats[]>(
    () =>
      outletOptions.map((outlet, index) => {
        const stats = perOutlet[index]?.data;
        const outOfStock = stats?.outOfStockItemCount ?? 0;

        return {
          outletId: outlet.outletId,
          outletName: outlet.name,
          // Same correction the catalogue strip makes: `inventoryItemCount` is
          // every row this outlet holds, empties included, so the empty ones
          // have to come back off before it can be called "berstok".
          stockedProducts: Math.max(0, (stats?.inventoryItemCount ?? 0) - outOfStock),
          lowStockCount: stats?.lowStockItemCount ?? 0,
          outOfStockCount: outOfStock,
        };
      }),
    [outletOptions, perOutlet]
  );

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      {/* The shell's top bar carries the title; this is its subtitle. */}
      <Text variant="body" tone="muted">
        Ringkasan ketersediaan produk di seluruh outlet.
      </Text>

      {operations.isPending ? (
        <StockDashboardSkeleton />
      ) : operations.isError || !operations.data ? (
        <DashboardLoadFailure message="Gagal memuat dashboard stok." />
      ) : (
        <>
          <OutletStockTable
            outlets={outletRows}
            caption="Menampilkan seluruh outlet aktif."
            onManage={(outlet) => navigate(`/inventory?outlet=${encodeURIComponent(outlet)}`)}
          />

          <CatalogueStrip summary={operations.data} />
        </>
      )}
    </div>
  );
}
