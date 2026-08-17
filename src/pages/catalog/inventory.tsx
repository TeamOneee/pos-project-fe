/**
 * S-15 · Inventori.
 *
 * `GET /inventory` requires `outlet_id` and there is no all-outlets list
 * endpoint, so the outlet choice is not a filter tucked into the top bar — it
 * is the precondition for there being a table at all. It sits at the top of the
 * content area, and until one is chosen the table area says so.
 *
 * The Owner sees the same screen without any way to change anything: no header
 * buttons, no action column, no adjust link in the drawer. Those affordances
 * are not rendered rather than disabled — a read-only screen with greyed-out
 * buttons still ships the buttons.
 */

import * as React from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/components/pages/auth/auth-provider';
import {
  AdjustStockDialog,
  type AdjustTarget,
} from '@/components/pages/inventory/adjust-stock-dialog';
import { BulkUpdateDialog } from '@/components/pages/inventory/bulk-update-dialog';
import {
  InventoryFilterBar,
  matchesCondition,
  matchesQuery,
  type StockCondition,
} from '@/components/pages/inventory/inventory-filters';
import {
  InventoryTable,
  toInventoryRow,
  type InventoryRow,
} from '@/components/pages/inventory/inventory-table';
import { OutletPicker } from '@/components/pages/inventory/outlet-picker';
import {
  StockPerOutletDrawer,
  type DrawerProduct,
} from '@/components/pages/inventory/stock-per-outlet-drawer';
import { TransferStockDialog } from '@/components/pages/inventory/transfer-stock-dialog';
import { useInventory, useLowStock } from '@/hooks/use-inventory';
import { useOutlets } from '@/hooks/use-outlets';
import { canManage } from '@/lib/permissions';
import { thresholdFromAlerts } from '@/lib/stock';

/** One outlet rarely carries more rows than this; paging would add a control for nothing. */
const PAGE_LIMIT = 200;

export default function InventoryPage() {
  const { role } = useAuth();
  const editable = role !== null && canManage(role, 'inventory');

  // The Admin dashboard's "Kelola Stok →" link arrives with the outlet already
  // decided, which is the whole point of that link.
  const [searchParams, setSearchParams] = useSearchParams();
  const outletId = searchParams.get('outlet');

  const [query, setQuery] = React.useState('');
  const [condition, setCondition] = React.useState<StockCondition>('ALL');
  const [adjustTarget, setAdjustTarget] = React.useState<AdjustTarget | null>(null);
  const [drawerProduct, setDrawerProduct] = React.useState<DrawerProduct | null>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);

  const outlets = useOutlets({ status: 'ACTIVE' });
  const inventory = useInventory({
    ...(outletId ? { outlet_id: outletId } : {}),
    limit: PAGE_LIMIT,
  });
  // Only for the threshold that decides where AMAN turns into MENIPIS.
  const lowStock = useLowStock(outletId ?? undefined);
  const threshold = thresholdFromAlerts(lowStock.data);

  const outletOptions = React.useMemo(
    () => (outlets.data ?? []).map((outlet) => ({ outletId: outlet.outletId, name: outlet.name })),
    [outlets.data]
  );
  const outletName =
    outletOptions.find((outlet) => outlet.outletId === outletId)?.name ?? 'outlet ini';

  const allRows = React.useMemo(
    () => (inventory.data?.items ?? []).map(toInventoryRow),
    [inventory.data]
  );
  const rows = React.useMemo(
    () =>
      allRows.filter(
        (row) => matchesQuery(row, query) && matchesCondition(row.quantity, threshold, condition)
      ),
    [allRows, query, condition, threshold]
  );

  const selectOutlet = (next: string) => {
    setSearchParams({ outlet: next }, { replace: true });
  };

  const openAdjust = (row: InventoryRow) => {
    if (!outletId) return;
    setAdjustTarget({
      inventoryId: row.inventoryId,
      productId: row.productId,
      productName: row.name,
      sku: row.sku,
      outletId,
      outletName,
      currentStock: row.quantity,
    });
  };

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      <div className="flex flex-col gap-md tablet:flex-row tablet:items-start tablet:justify-between">
        {editable ? (
          <Text variant="body" tone="muted">
            Kelola stok per outlet: sesuaikan, update massal, atau transfer antar outlet.
          </Text>
        ) : (
          <Text variant="body" tone="muted">
            Tampilan hanya-baca. Penyesuaian stok dilakukan oleh Admin.
          </Text>
        )}

        {/* Owner variant: no header buttons in the DOM at all. */}
        {editable && (
          <div className="flex shrink-0 flex-row gap-md">
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>
              <Text>Update Massal</Text>
            </Button>
            <Button onClick={() => setTransferOpen(true)}>
              <Text>Transfer Stok</Text>
            </Button>
          </div>
        )}
      </div>

      <OutletPicker
        outlets={outletOptions}
        value={outletId}
        onChange={selectOutlet}
        loading={outlets.isPending}
      />

      <Card>
        <CardContent className="flex flex-col gap-lg pt-lg">
          {!outletId ? (
            <div className="flex items-center justify-center py-3xl">
              <Text variant="body" tone="muted">
                Pilih outlet untuk melihat stok.
              </Text>
            </div>
          ) : (
            <>
              <InventoryFilterBar
                query={query}
                onQueryChange={setQuery}
                condition={condition}
                onConditionChange={setCondition}
              />

              {inventory.isPending ? (
                <TableSkeleton />
              ) : inventory.isError ? (
                <div className="flex items-center justify-center py-3xl">
                  <Text variant="body" tone="danger">
                    Gagal memuat stok outlet ini.
                  </Text>
                </div>
              ) : (
                <InventoryTable
                  rows={rows}
                  threshold={threshold}
                  onAdjust={editable ? openAdjust : undefined}
                  onOpenStockPerOutlet={(row) =>
                    setDrawerProduct({ productId: row.productId, name: row.name, sku: row.sku })
                  }
                  emptyMessage={
                    allRows.length === 0
                      ? 'Belum ada produk berstok di outlet ini.'
                      : 'Tidak ada produk yang cocok dengan filter.'
                  }
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Every mutation surface below is Admin-only and simply absent otherwise. */}
      {editable && (
        <>
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
            outletLocked={Boolean(outletId)}
          />

          <TransferStockDialog
            open={transferOpen}
            onOpenChange={setTransferOpen}
            outlets={outletOptions}
            defaultFromOutletId={outletId}
          />
        </>
      )}

      <StockPerOutletDrawer
        product={drawerProduct}
        open={drawerProduct !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerProduct(null);
        }}
        outlets={outletOptions}
        threshold={threshold}
        onAdjust={
          editable
            ? (target) => {
                setDrawerProduct(null);
                setAdjustTarget(target);
              }
            : undefined
        }
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[0, 1, 2, 3, 4].map((index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
