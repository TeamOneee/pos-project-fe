/**
 * S-15 · Inventori.
 *
 * `GET /inventory` requires `outlet_id` and there is no all-outlets list
 * endpoint, so the outlet choice is not a filter tucked into the top bar — it
 * is the precondition for there being a table at all. It sits at the top of the
 * content area, and until one is chosen the table area says so.
 *
 * Both roles here manage stock (BR-011B), so the screen is a single variant:
 * every session may adjust stock from a row or from the stock drawer.
 */

import * as React from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { AddStockDialog } from '@/components/pages/inventory/add-stock-dialog';
import {
  AdjustStockDialog,
  type AdjustTarget,
} from '@/components/pages/inventory/adjust-stock-dialog';
import type { PickedProduct } from '@/components/pages/inventory/product-search-select';
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

/** One outlet rarely carries more rows than this; paging would add a control for nothing. §0 caps size at 100. */
const PAGE_LIMIT = 100;

export default function InventoryPage() {
  // The Admin dashboard's "Kelola Stok →" link arrives with the outlet already
  // decided, which is the whole point of that link.
  const [searchParams, setSearchParams] = useSearchParams();
  const outletId = searchParams.get('outlet');

  const [query, setQuery] = React.useState('');
  const [condition, setCondition] = React.useState<StockCondition>('ALL');
  const [adjustTarget, setAdjustTarget] = React.useState<AdjustTarget | null>(null);
  const [drawerProduct, setDrawerProduct] = React.useState<DrawerProduct | null>(null);
  const [addStockOpen, setAddStockOpen] = React.useState(false);

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

  /** A picked product has no row yet, so its first adjustment starts at zero. */
  const openAddStock = (product: PickedProduct) => {
    if (!outletId) return;
    setAddStockOpen(false);
    setAdjustTarget({
      productId: product.productId,
      productName: product.name,
      outletId,
      outletName,
      currentStock: 0,
    });
  };

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      <div className="flex flex-col gap-md tablet:flex-row tablet:items-start tablet:justify-between">
        <Text variant="body" tone="muted">
          Kelola stok per outlet: sesuaikan, update massal, atau transfer antar outlet.
        </Text>

        {/*
          Stock only comes into being through an adjustment (§4.2), and a product
          with no row is invisible in the table below — so the first stock needs
          its own entry point. Hidden until an outlet decides the target.
        */}
        {outletId ? (
          <Button className="shrink-0" onClick={() => setAddStockOpen(true)}>
            <Text>+ Tambah Stok</Text>
          </Button>
        ) : null}
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
                  onAdjust={openAdjust}
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

      <AdjustStockDialog
        target={adjustTarget}
        open={adjustTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAdjustTarget(null);
        }}
      />

      <AddStockDialog
        open={addStockOpen}
        onOpenChange={setAddStockOpen}
        outletName={outletName}
        onPick={openAddStock}
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

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[0, 1, 2, 3, 4].map((index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
