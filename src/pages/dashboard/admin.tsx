/**
 * S-14 · Admin stock dashboard — the Admin's landing screen.
 *
 * Contract §6.2 replaced the single `/dashboard/admin` payload with granular
 * endpoints, so this screen composes four reads:
 *
 *   • `GET /dashboard/low-stock` — the work queue.
 *   • `GET /dashboard/operations?outlet_id=` per outlet — the per-outlet table.
 *   • `GET /dashboard/operations` — the catalogue reference figures.
 *   • `GET /products?is_active=false` — which queue rows are retired products,
 *     since §6.4's low-stock row does not say (use-inactive-products.ts).
 *
 * The screen is ordered as a queue rather than a report. An Admin opens it to
 * find what needs restocking, so the list of exactly that comes first, its
 * counts double as its filter, and the catalogue totals — which nobody acts on —
 * sit at the bottom in their own scope.
 *
 * Three scopes live here and each says so on screen: the queue follows the
 * outlet filter, the per-outlet table never does (that is the point of it), and
 * the catalogue strip is merchant-wide.
 *
 * The Admin has no analytics, no AI insight and no transaction history: the
 * role matrix closes all three, and nothing on this screen links to them.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { useTopBarActions } from '@/components/layouts/shell-context';
import { Button } from '@/components/ui/button';
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
import {
  AdjustStockDialog,
  type AdjustTarget,
} from '@/components/pages/inventory/adjust-stock-dialog';
import {
  StockPerOutletDrawer,
  type DrawerProduct,
} from '@/components/pages/inventory/stock-per-outlet-drawer';
import {
  countQueue,
  filterQueue,
  PartialStatusNotice,
  StockQueueCard,
  toQueueRows,
  type StockFilter,
} from '@/components/pages/inventory/stock-queue';
import { OutletSelect } from '@/components/pages/owner/controls';
import { useDashboardOperations, useLowStock, useOperationsByOutlet } from '@/hooks/use-dashboard';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useInactiveProductIds } from '@/hooks/use-inactive-products';
import { useOutlets } from '@/hooks/use-outlets';
import { sortByUrgency } from '@/lib/stock';
import type { LowStockItem } from '@/services/dashboard';

export default function AdminDashboardPage() {
  const mobile = useBreakpoint() === 'mobile';
  const navigate = useNavigate();

  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<StockFilter>('all');

  const operations = useDashboardOperations({ outlet_id: outletId ?? undefined });
  const lowStock = useLowStock({ outlet_id: outletId ?? undefined });
  const outlets = useOutlets({ status: 'ACTIVE' });
  const inactive = useInactiveProductIds();

  const [adjustTarget, setAdjustTarget] = React.useState<AdjustTarget | null>(null);
  const [drawerProduct, setDrawerProduct] = React.useState<DrawerProduct | null>(null);

  const outletOptions = React.useMemo(
    () =>
      (outlets.data?.items ?? []).map((outlet) => ({
        outletId: outlet.outletId,
        name: outlet.name,
      })),
    [outlets.data]
  );

  // The per-outlet table always spans every outlet, even when the page filter
  // narrows the tiles — that is the point of the table.
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

  // Memoized so the top-bar slot sees a stable node — it is fed through an
  // effect, and a fresh element each render would loop the update.
  const controls = React.useMemo(
    () => <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />,
    [outletOptions, outletId]
  );
  useTopBarActions(!mobile ? controls : null);

  // One payload, one queue: §6.2 reports everything at or below its effective
  // threshold, and a quantity of zero is at or below every threshold — so the
  // empty shelves are a filter over this list, not a second list.
  const sorted = React.useMemo(() => sortByUrgency(lowStock.data?.items ?? []), [lowStock.data]);
  const rows = React.useMemo(() => toQueueRows(sorted, inactive.ids), [sorted, inactive.ids]);
  const counts = React.useMemo(() => countQueue(rows), [rows]);
  const visible = React.useMemo(() => filterQueue(rows, filter), [rows, filter]);

  const isPending = operations.isPending || lowStock.isPending;
  const isError = operations.isError || lowStock.isError;

  const selectedOutlet = outletOptions.find((outlet) => outlet.outletId === outletId);

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      {/* The shell's top bar carries the title; this is its subtitle. */}
      <Text variant="body" tone="muted">
        Ringkasan ketersediaan produk di seluruh outlet.
      </Text>

      {mobile && <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />}

      {isPending ? (
        <StockDashboardSkeleton />
      ) : isError || !operations.data ? (
        <DashboardLoadFailure message="Gagal memuat dashboard stok." />
      ) : (
        <>
          {/* The outlet filter governs the queue. It deliberately does not govern
              the table below, so both say which they are. */}
          <div className="flex flex-row flex-wrap items-center gap-sm">
            <Text variant="caption" tone="subtle">
              {selectedOutlet
                ? `Antrean difilter ke ${selectedOutlet.name}.`
                : 'Antrean mencakup seluruh outlet.'}
            </Text>
            {selectedOutlet && (
              <Button variant="ghost" size="sm" onClick={() => setOutletId(null)}>
                <Text>Lihat semua outlet</Text>
              </Button>
            )}
          </div>

          <StockQueueCard
            title="Perlu Tindakan"
            rows={visible}
            counts={counts}
            filter={filter}
            onFilterChange={setFilter}
            notice={
              <PartialStatusNotice complete={inactive.complete} pending={inactive.isPending} />
            }
            filteredEmpty={
              <Text variant="body" tone="muted" className="text-center">
                Tidak ada produk pada saringan ini.
              </Text>
            }
            onAdjust={(alert) => setAdjustTarget(toAdjustTarget(alert))}
            onOpenStockPerOutlet={setDrawerProduct}
          />

          <OutletStockTable
            outlets={outletRows}
            caption="Selalu menampilkan seluruh outlet, terlepas dari filter di atas."
            onManage={(outlet) => navigate(`/inventory?outlet=${encodeURIComponent(outlet)}`)}
          />

          <CatalogueStrip summary={operations.data} />
        </>
      )}

      <AdjustStockDialog
        target={adjustTarget}
        open={adjustTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAdjustTarget(null);
        }}
      />

      <StockPerOutletDrawer
        product={drawerProduct}
        open={drawerProduct !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerProduct(null);
        }}
        onAdjust={(target) => {
          setDrawerProduct(null);
          setAdjustTarget(target);
        }}
      />
    </div>
  );
}

/**
 * Both tables hand the modal the same shape — an adjustment is addressed by
 * outlet and product, never by an inventory row id (§4.2).
 */
function toAdjustTarget(alert: LowStockItem): AdjustTarget {
  return {
    productId: alert.productId,
    productName: alert.productName,
    outletId: alert.outletId,
    outletName: alert.outletName,
    currentStock: alert.quantity,
  };
}
