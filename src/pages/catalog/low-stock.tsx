/**
 * S-15c · Stok Menipis.
 *
 * The fuller version of the Admin dashboard's alert card: the same rows, but
 * filterable by outlet and with a bulk path out of them. `GET
 * /inventory/low-stock` takes an optional `outlet_id`, so unlike S-15 this
 * screen works across every outlet by default — the filter narrows, it does not
 * unlock.
 *
 * "Update Massal" carries exactly what the filter is showing into S-15d, which
 * is the point: the list on screen is the work list.
 */

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
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
import { useInactiveProductIds } from '@/hooks/use-inactive-products';
import { useLowStock } from '@/hooks/use-dashboard';
import { useOutlets } from '@/hooks/use-outlets';
import { formatCount } from '@/lib/number';
import { sortByUrgency } from '@/lib/stock';

export default function LowStockPage() {
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<StockFilter>('all');
  const [adjustTarget, setAdjustTarget] = React.useState<AdjustTarget | null>(null);
  const [drawerProduct, setDrawerProduct] = React.useState<DrawerProduct | null>(null);

  const outlets = useOutlets({ status: 'ACTIVE' });
  const lowStock = useLowStock({ outlet_id: outletId ?? undefined });
  const inactive = useInactiveProductIds();

  const outletOptions = React.useMemo(
    () =>
      (outlets.data?.items ?? []).map((outlet) => ({
        outletId: outlet.outletId,
        name: outlet.name,
      })),
    [outlets.data]
  );

  const sorted = React.useMemo(() => sortByUrgency(lowStock.data?.items ?? []), [lowStock.data]);
  const rows = React.useMemo(() => toQueueRows(sorted, inactive.ids), [sorted, inactive.ids]);
  const counts = React.useMemo(() => countQueue(rows), [rows]);
  const visible = React.useMemo(() => filterQueue(rows, filter), [rows, filter]);

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      <div className="flex flex-col gap-md tablet:flex-row tablet:items-center tablet:justify-between">
        <Text variant="body" tone="muted">
          {lowStock.isPending ? 'Memuat…' : `${formatCount(counts.all)} produk perlu perhatian.`}
        </Text>

        {/* Bulk update is gone with its endpoint (§4.2); stock is adjusted per row. */}
        <div className="flex flex-col gap-md tablet:flex-row tablet:items-center">
          <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />
        </div>
      </div>

      {lowStock.isPending ? (
        <Card>
          <CardContent className="flex flex-col gap-md pt-lg">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : lowStock.isError ? (
        <Card>
          <CardContent className="flex items-center justify-center py-3xl">
            <Text variant="body" tone="danger">
              Gagal memuat daftar stok menipis.
            </Text>
          </CardContent>
        </Card>
      ) : counts.all === 0 && outletId ? (
        // Filtered to one outlet with no matches is a different state from
        // nothing being low anywhere: different copy, and a way back out.
        <Card>
          <CardContent className="flex flex-col items-center gap-md py-3xl">
            <Text variant="body" tone="muted" className="text-center">
              Tidak ada produk menipis di outlet ini.
            </Text>
            <Button variant="ghost" onClick={() => setOutletId(null)}>
              <Text>Lihat semua outlet</Text>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <StockQueueCard
          rows={visible}
          counts={counts}
          filter={filter}
          onFilterChange={setFilter}
          notice={<PartialStatusNotice complete={inactive.complete} pending={inactive.isPending} />}
          filteredEmpty={
            <Text variant="body" tone="muted" className="text-center">
              Tidak ada produk pada saringan ini.
            </Text>
          }
          onAdjust={(alert) =>
            setAdjustTarget({
              productId: alert.productId,
              productName: alert.productName,
              outletId: alert.outletId,
              outletName: alert.outletName,
              currentStock: alert.quantity,
            })
          }
          onOpenStockPerOutlet={setDrawerProduct}
        />
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
