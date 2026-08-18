/**
 * S-14 · Admin stock dashboard — the Admin's landing screen.
 *
 * Contract §6.2 replaced the single `/dashboard/admin` payload with granular
 * endpoints, so this screen composes three reads:
 *
 *   • `GET /dashboard/operations` — the four KPI tiles.
 *   • `GET /dashboard/operations?outlet_id=` per outlet — the per-outlet table.
 *   • `GET /dashboard/low-stock` — both alert tables, split on quantity.
 *
 * The Admin has no analytics, no AI insight and no transaction history: the
 * role matrix closes all three, and nothing on this screen links to them.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { useTopBarActions } from '@/components/layouts/shell-context';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { LowStockCard, OutOfStockCard } from '@/components/pages/admin-dashboard/alert-cards';
import {
  OutletStockTable,
  type OutletStats,
} from '@/components/pages/admin-dashboard/outlet-stock-table';
import { StockKpiRow } from '@/components/pages/admin-dashboard/stock-kpi-row';
import {
  AdjustStockDialog,
  type AdjustTarget,
} from '@/components/pages/inventory/adjust-stock-dialog';
import {
  lowStockOnly,
  outOfStockOnly,
  sortByUrgency,
} from '@/components/pages/inventory/alert-tables';
import {
  StockPerOutletDrawer,
  type DrawerProduct,
} from '@/components/pages/inventory/stock-per-outlet-drawer';
import { OutletSelect } from '@/components/pages/owner/controls';
import { useDashboardOperations, useLowStock, useOperationsByOutlet } from '@/hooks/use-dashboard';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useOutlets } from '@/hooks/use-outlets';
import type { LowStockItem } from '@/services/dashboard';

export default function AdminDashboardPage() {
  const mobile = useBreakpoint() === 'mobile';
  const navigate = useNavigate();

  const [outletId, setOutletId] = React.useState<string | null>(null);

  const operations = useDashboardOperations({ outlet_id: outletId ?? undefined });
  const lowStock = useLowStock({ outlet_id: outletId ?? undefined });
  const outlets = useOutlets({ status: 'ACTIVE' });

  const [adjustTarget, setAdjustTarget] = React.useState<AdjustTarget | null>(null);
  const [drawerProduct, setDrawerProduct] = React.useState<DrawerProduct | null>(null);

  const lowStockRef = React.useRef<HTMLDivElement>(null);
  const outOfStockRef = React.useRef<HTMLDivElement>(null);

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
        return {
          outletId: outlet.outletId,
          outletName: outlet.name,
          stockedProducts: stats?.inventoryItemCount ?? 0,
          lowStockCount: stats?.lowStockItemCount ?? 0,
          outOfStockCount: stats?.outOfStockItemCount ?? 0,
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

  // One payload, two tables: §6.2 reports everything at or below its effective
  // threshold, and a quantity of zero is at or below every threshold.
  const alerts = React.useMemo(() => sortByUrgency(lowStock.data?.items ?? []), [lowStock.data]);
  const low = React.useMemo(() => lowStockOnly(alerts), [alerts]);
  const out = React.useMemo(() => outOfStockOnly(alerts), [alerts]);

  const isPending = operations.isPending || lowStock.isPending;
  const isError = operations.isError || lowStock.isError;

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
        <LoadFailure />
      ) : (
        <>
          <StockKpiRow
            summary={operations.data}
            onShowLowStock={() => scrollTo(lowStockRef)}
            onShowOutOfStock={() => scrollTo(outOfStockRef)}
          />

          <OutletStockTable
            outlets={outletRows}
            onManage={(outlet) => navigate(`/inventory?outlet=${encodeURIComponent(outlet)}`)}
          />

          <LowStockCard
            anchorRef={lowStockRef}
            alerts={low}
            onAdjust={(alert) => setAdjustTarget(toAdjustTarget(alert))}
            onOpenStockPerOutlet={setDrawerProduct}
          />

          <OutOfStockCard
            anchorRef={outOfStockRef}
            alerts={out}
            onAdjust={(alert) => setAdjustTarget(toAdjustTarget(alert))}
            onOpenStockPerOutlet={setDrawerProduct}
          />
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

function StockDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-row flex-wrap gap-lg">
        {[0, 1, 2, 3].map((index) => (
          <Card key={index} className="min-w-[140px] flex-1 basis-full tablet:basis-0">
            <CardContent className="flex flex-col gap-sm pt-lg">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {[0, 1, 2].map((card) => (
        <Card key={card}>
          <CardContent className="flex flex-col gap-md pt-lg">
            <Skeleton className="h-6 w-48" />
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LoadFailure() {
  return (
    <div className="flex flex-1 items-center justify-center p-xl">
      <Text variant="body" tone="danger">
        Gagal memuat dashboard stok.
      </Text>
    </div>
  );
}
