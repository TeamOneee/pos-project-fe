/** S-14 · Admin stock dashboard — the Admin's landing screen. */

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
          // Same correction the catalogue strip makes: `inventoryItemCount` is every row this
          // outlet holds, empties included, so the empty ones have to come back off before it can
          // be called "berstok".
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
