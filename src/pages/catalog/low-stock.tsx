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
import { LowStockTable, sortByUrgency } from '@/components/pages/inventory/alert-tables';
import { BulkUpdateDialog } from '@/components/pages/inventory/bulk-update-dialog';
import {
  StockPerOutletDrawer,
  type DrawerProduct,
} from '@/components/pages/inventory/stock-per-outlet-drawer';
import { OutletSelect } from '@/components/pages/owner/controls';
import { useLowStock } from '@/hooks/use-inventory';
import { useOutlets } from '@/hooks/use-outlets';
import { thresholdFromAlerts } from '@/lib/stock';
import { formatCount } from '@/lib/number';

export default function LowStockPage() {
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = React.useState<AdjustTarget | null>(null);
  const [drawerProduct, setDrawerProduct] = React.useState<DrawerProduct | null>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);

  const outlets = useOutlets({ status: 'ACTIVE' });
  const lowStock = useLowStock(outletId ?? undefined);

  const outletOptions = React.useMemo(
    () => (outlets.data ?? []).map((outlet) => ({ outletId: outlet.outletId, name: outlet.name })),
    [outlets.data]
  );

  const alerts = React.useMemo(() => sortByUrgency(lowStock.data ?? []), [lowStock.data]);
  const threshold = thresholdFromAlerts(lowStock.data);

  // The bulk modal writes to one outlet at a time, so it can only carry the
  // list forward once the filter has narrowed to one.
  const bulkSeed = React.useMemo(
    () =>
      alerts.map((alert) => ({
        productId: alert.productId,
        name: alert.productName,
        sku: alert.sku,
      })),
    [alerts]
  );

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      <div className="flex flex-col gap-md tablet:flex-row tablet:items-center tablet:justify-between">
        <Text variant="body" tone="muted">
          {lowStock.isPending ? 'Memuat…' : `${formatCount(alerts.length)} produk perlu perhatian.`}
        </Text>

        <div className="flex flex-col gap-md tablet:flex-row tablet:items-center">
          <OutletSelect outlets={outletOptions} value={outletId} onChange={setOutletId} />
          <Button
            variant="secondary"
            disabled={alerts.length === 0}
            onClick={() => setBulkOpen(true)}
          >
            <Text>Update Massal</Text>
          </Button>
        </div>
      </div>

      {!outletId && alerts.length > 0 && (
        <Text variant="caption" tone="subtle">
          Update massal berlaku untuk satu outlet. Pilih outlet dulu, atau pilih outletnya di dalam
          jendela update.
        </Text>
      )}

      <Card>
        <CardContent className="pt-lg">
          {lowStock.isPending ? (
            <div className="flex flex-col gap-md">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : lowStock.isError ? (
            <div className="flex items-center justify-center py-3xl">
              <Text variant="body" tone="danger">
                Gagal memuat daftar stok menipis.
              </Text>
            </div>
          ) : alerts.length === 0 ? (
            // Filtered to one outlet with no matches is a different state from
            // nothing being low anywhere: different copy, and a way back out.
            <div className="flex flex-col items-center gap-md py-3xl">
              <Text variant="body" tone="muted" className="text-center">
                {outletId
                  ? 'Tidak ada produk menipis di outlet ini.'
                  : 'Semua stok dalam kondisi aman. Tidak ada produk yang mendekati batas stok menipis.'}
              </Text>
              {outletId && (
                <Button variant="ghost" onClick={() => setOutletId(null)}>
                  <Text>Lihat semua outlet</Text>
                </Button>
              )}
            </div>
          ) : (
            <LowStockTable
              alerts={alerts}
              onAdjust={(alert) =>
                setAdjustTarget({
                  inventoryId: alert.inventoryId,
                  productId: alert.productId,
                  productName: alert.productName,
                  sku: alert.sku,
                  outletId: alert.outletId,
                  outletName: alert.outletName,
                  currentStock: alert.currentStock,
                })
              }
              onOpenStockPerOutlet={setDrawerProduct}
            />
          )}
        </CardContent>
      </Card>

      <AdjustStockDialog
        target={adjustTarget}
        open={adjustTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAdjustTarget(null);
        }}
      />

      <BulkUpdateDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        outlets={outletOptions}
        outletId={outletId}
        seed={bulkSeed}
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
