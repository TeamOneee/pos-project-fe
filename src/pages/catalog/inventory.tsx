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

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/components/pages/auth/auth-provider';
import {
  AdjustStockDialog,
  type AdjustTarget,
} from '@/components/pages/inventory/adjust-stock-dialog';
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
import { useInventory } from '@/hooks/use-inventory';
import { useOutlets } from '@/hooks/use-outlets';
import { canManage } from '@/lib/permissions';

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

  const outlets = useOutlets({ status: 'ACTIVE' });
  const inventory = useInventory({
    ...(outletId ? { outlet_id: outletId } : {}),
    size: PAGE_LIMIT,
  });

  const outletOptions = React.useMemo(
    () =>
      (outlets.data?.items ?? []).map((outlet) => ({
        outletId: outlet.outletId,
        name: outlet.name,
      })),
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
        (row) =>
          matchesQuery(row, query) &&
          // Each row carries the threshold it was judged against (§4.1 rule 5),
          // so the filter no longer needs one figure for the whole outlet.
          matchesCondition(row.quantity, row.effectiveLowStockThreshold, condition)
      ),
    [allRows, query, condition]
  );

  const selectOutlet = (next: string) => {
    setSearchParams({ outlet: next }, { replace: true });
  };

  const openAdjust = (row: InventoryRow) => {
    if (!outletId) return;
    setAdjustTarget({
      productId: row.productId,
      productName: row.name,
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

        {/*
          There are no header actions any more. §4.2 gives inventory exactly one
          write — `POST /inventory/adjustments`, one product at a time — so the
          bulk-update and transfer-between-outlets buttons had no endpoint behind
          them and are gone rather than left to 404. Adjustment lives on the row.
        */}
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
                  onAdjust={editable ? openAdjust : undefined}
                  onOpenStockPerOutlet={(row) =>
                    setDrawerProduct({ productId: row.productId, name: row.name })
                  }
                  // Two different empty states: an outlet with no stock rows at
                  // all, and a filter that matched none of the rows it has.
                  emptyMessage={
                    allRows.length === 0
                      ? 'Belum ada produk berstok di outlet ini. Tambahkan produk lewat menu Produk, lalu sesuaikan stoknya di sini.'
                      : 'Tidak ada produk yang cocok dengan filter.'
                  }
                  onClearFilters={
                    allRows.length === 0
                      ? undefined
                      : () => {
                          setQuery('');
                          setCondition('ALL');
                        }
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
        </>
      )}

      <StockPerOutletDrawer
        product={drawerProduct}
        open={drawerProduct !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerProduct(null);
        }}
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
