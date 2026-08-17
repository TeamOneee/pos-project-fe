/**
 * S-14 · Admin stock dashboard — the Admin's landing screen.
 *
 * `GET /dashboard/admin` is one endpoint carrying the whole surface, so this
 * screen has one query and one loading state, exactly like the Owner's.
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
import { OutletStockTable } from '@/components/pages/admin-dashboard/outlet-stock-table';
import { StockKpiRow } from '@/components/pages/admin-dashboard/stock-kpi-row';
import {
  AdjustStockDialog,
  type AdjustTarget,
} from '@/components/pages/inventory/adjust-stock-dialog';
import { sortByUrgency } from '@/components/pages/inventory/alert-tables';
import {
  StockPerOutletDrawer,
  type DrawerProduct,
} from '@/components/pages/inventory/stock-per-outlet-drawer';
import { OutletSelect } from '@/components/pages/owner/controls';
import { useAdminDashboard } from '@/hooks/use-dashboard';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useOutlets } from '@/hooks/use-outlets';
import type { OutOfStockAlert } from '@/services/dashboard';
import type { LowStockAlert } from '@/services/inventory';
import { thresholdFromAlerts } from '@/lib/stock';

export default function AdminDashboardPage() {
  const mobile = useBreakpoint() === 'mobile';
  const navigate = useNavigate();

  const [outletId, setOutletId] = React.useState<string | null>(null);
  const dashboard = useAdminDashboard(outletId ?? undefined);
  const outlets = useOutlets({ status: 'ACTIVE' });

  const [adjustTarget, setAdjustTarget] = React.useState<AdjustTarget | null>(null);
  const [drawerProduct, setDrawerProduct] = React.useState<DrawerProduct | null>(null);

  const lowStockRef = React.useRef<HTMLDivElement>(null);
  const outOfStockRef = React.useRef<HTMLDivElement>(null);

  const outletOptions = React.useMemo(
    () => (outlets.data ?? []).map((outlet) => ({ outletId: outlet.outletId, name: outlet.name })),
    [outlets.data]
  );

  // Memoized so the top-bar slot sees a stable node — it is fed through an
  // effect, and a fresh element each render would loop the update.
  const controls = React.useMemo(
    () => <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />,
    [outletOptions, outletId]
  );
  useTopBarActions(!mobile ? controls : null);

  const data = dashboard.data;
  const lowStockAlerts = React.useMemo(
    () => sortByUrgency(data?.lowStockAlerts ?? []),
    [data?.lowStockAlerts]
  );
  const threshold = thresholdFromAlerts(data?.lowStockAlerts);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      {/* The shell's top bar carries the title; this is its subtitle. */}
      <Text variant="body" tone="muted">
        Ringkasan ketersediaan produk di seluruh outlet.
      </Text>

      {mobile && <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />}

      {dashboard.isPending ? (
        <StockDashboardSkeleton />
      ) : dashboard.isError || !data ? (
        <LoadFailure />
      ) : (
        <>
          <StockKpiRow
            summary={data.summary}
            onShowLowStock={() => scrollTo(lowStockRef)}
            onShowOutOfStock={() => scrollTo(outOfStockRef)}
          />

          <OutletStockTable
            outlets={data.outletQuickStats}
            onManage={(outlet) => navigate(`/inventory?outlet=${encodeURIComponent(outlet)}`)}
          />

          <LowStockCard
            anchorRef={lowStockRef}
            alerts={lowStockAlerts}
            onAdjust={(alert) => setAdjustTarget(fromLowStock(alert))}
            onOpenStockPerOutlet={setDrawerProduct}
          />

          <OutOfStockCard
            anchorRef={outOfStockRef}
            alerts={data.outOfStockAlerts}
            onAdjust={(alert) => setAdjustTarget(fromOutOfStock(alert))}
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
        outlets={outletOptions}
        threshold={threshold}
        onAdjust={(target) => {
          setDrawerProduct(null);
          setAdjustTarget(target);
        }}
      />
    </div>
  );
}

function fromLowStock(alert: LowStockAlert): AdjustTarget {
  return {
    inventoryId: alert.inventoryId,
    productId: alert.productId,
    productName: alert.productName,
    sku: alert.sku,
    outletId: alert.outletId,
    outletName: alert.outletName,
    currentStock: alert.currentStock,
  };
}

/** Out-of-stock alerts carry no inventory id; the modal resolves it. */
function fromOutOfStock(alert: OutOfStockAlert): AdjustTarget {
  return {
    inventoryId: null,
    productId: alert.productId,
    productName: alert.productName,
    sku: alert.sku,
    outletId: alert.outletId,
    outletName: alert.outletName,
    currentStock: 0,
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
