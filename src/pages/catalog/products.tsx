/** S-11 · Produk. */

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import type { RowMenuItem } from '@/components/ui/row-menu';
import { DeactivateDialog, HISTORY_PRESERVED } from '@/components/pages/catalog/deactivate-dialog';
import { ProductDialog } from '@/components/pages/catalog/product-dialog';
import {
  EMPTY_QUERY,
  isFiltered,
  ProductFilterBar,
  type ProductQuery,
  type ProductView,
} from '@/components/pages/catalog/product-filters';
import { ProductGrid } from '@/components/pages/catalog/product-grid';
import { ProductTable, type CatalogRow } from '@/components/pages/catalog/product-table';
import { PaginationFooter } from '@/components/ui/pagination-footer';
import {
  AdjustStockDialog,
  type AdjustTarget,
} from '@/components/pages/inventory/adjust-stock-dialog';
import {
  StockPerOutletDrawer,
  type DrawerProduct,
} from '@/components/pages/inventory/stock-per-outlet-drawer';
import { categoryHueIndex } from '@/lib/category-color';
import { useCategories } from '@/hooks/use-categories';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDeactivateProduct, useProducts } from '@/hooks/use-products';
import type { Product } from '@/services/products';
import { activeCategoryIndex, isHiddenByCategory } from '@/lib/catalog-visibility';

/** The brief's pagination footer counts in tens. */
const PAGE_LIMIT = 10;

export default function ProductsPage() {
  const { toast } = useToast();

  const [query, setQuery] = React.useState<ProductQuery>(EMPTY_QUERY);
  const [view, setView] = React.useState<ProductView>('table');
  const [page, setPage] = React.useState(1);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deactivating, setDeactivating] = React.useState<Product | null>(null);
  const [drawerProduct, setDrawerProduct] = React.useState<DrawerProduct | null>(null);
  const [adjustTarget, setAdjustTarget] = React.useState<AdjustTarget | null>(null);

  // Typing stays local; the request follows once it pauses.
  const search = useDebouncedValue(query.search.trim(), 300);

  const products = useProducts({
    ...(search ? { search } : {}),
    ...(query.categoryId ? { category_id: query.categoryId } : {}),
    // §3.2 filters on the boolean, not on the ACTIVE/INACTIVE enum.
    ...(query.status ? { is_active: query.status === 'ACTIVE' } : {}),
    // §0 pages from zero; the footer counts from one.
    page: page - 1,
    size: PAGE_LIMIT,
  });
  const categories = useCategories();
  const deactivate = useDeactivateProduct();

  // A filter change invalidates the page number: page 4 of a narrower list is usually empty, which
  // looks like "no results" for the wrong reason.
  const filterKey = `${search}|${query.categoryId ?? ''}|${query.status ?? ''}`;
  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const activeCategories = React.useMemo(
    () => activeCategoryIndex(categories.data?.items ?? []),
    [categories.data]
  );

  // Built from the merchant's category list, not from the rows on screen, so a category keeps its
  // colour on every page of the catalogue.
  const categoryHues = React.useMemo(
    () => categoryHueIndex(categories.data?.items ?? []),
    [categories.data]
  );

  const rows = React.useMemo<CatalogRow[]>(
    () =>
      (products.data?.items ?? []).map((product) => ({
        product,
        // Only meaningful for a product that is itself active — an inactive product is already
        // absent from the POS for its own reasons.
        hiddenByCategory: product.isActive && isHiddenByCategory(product, activeCategories),
      })),
    [products.data, activeCategories]
  );

  const openStock = (product: Product) =>
    setDrawerProduct({ productId: product.productId, name: product.name });

  const openEditor = (product: Product | null) => {
    setEditing(product);
    setEditorOpen(true);
  };

  /**
   * The row menu, built for every session that reaches this screen — both roles manage the catalog
   * (BR-011B).
   */
  const rowMenu = (product: Product): RowMenuItem[] => [
    { label: 'Edit', onSelect: () => openEditor(product) },
    { label: 'Lihat Stok per Outlet', onSelect: () => openStock(product) },
    ...(product.isActive
      ? [
          {
            label: 'Nonaktifkan',
            tone: 'danger' as const,
            onSelect: () => setDeactivating(product),
          },
        ]
      : []),
  ];

  const confirmDeactivate = () => {
    if (!deactivating) return;
    const name = deactivating.name;

    deactivate.mutate(deactivating.productId, {
      onSuccess: () => {
        toast({
          variant: 'success',
          title: 'Produk dinonaktifkan',
          description: `${name} tidak lagi muncul di katalog kasir.`,
        });
        setDeactivating(null);
      },
    });
  };

  const total = products.data?.total ?? 0;
  const filtered = isFiltered(query);

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      <div className="flex flex-col gap-md tablet:flex-row tablet:items-start tablet:justify-between">
        <Text variant="body" tone="muted">
          Katalog produk merchant Anda.
        </Text>

        <Button className="shrink-0" onClick={() => openEditor(null)}>
          <Text>+ Tambah Produk</Text>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-lg pt-lg">
          <ProductFilterBar
            query={query}
            onQueryChange={setQuery}
            categories={categories.data?.items ?? []}
            view={view}
            onViewChange={setView}
          />

          {products.isPending ? (
            <ListSkeleton />
          ) : products.isError ? (
            <div className="flex items-center justify-center py-3xl">
              <Text variant="body" tone="danger">
                Gagal memuat daftar produk.
              </Text>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              filtered={filtered}
              onClearFilters={() => setQuery(EMPTY_QUERY)}
              onCreate={() => openEditor(null)}
            />
          ) : (
            <>
              {view === 'table' ? (
                <ProductTable
                  rows={rows}
                  rowMenu={rowMenu}
                  onOpenStock={openStock}
                  categoryHues={categoryHues}
                />
              ) : (
                <ProductGrid
                  rows={rows}
                  rowMenu={rowMenu}
                  onOpenStock={openStock}
                  categoryHues={categoryHues}
                />
              )}

              <PaginationFooter
                page={page}
                limit={products.data?.size ?? PAGE_LIMIT}
                total={total}
                shown={rows.length}
                totalPages={products.data?.totalPages ?? 1}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Editing and deactivating — every session here may manage the catalog. */}
      <ProductDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        product={editing}
        categories={categories.data?.items ?? []}
      />

      <DeactivateDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
        title={`Nonaktifkan ${deactivating?.name ?? 'produk ini'}?`}
        preserved={`${HISTORY_PRESERVED} Stok per outlet juga tidak berubah, dan produk bisa diaktifkan kembali dari layar ini.`}
        pending={deactivate.isPending}
        error={deactivate.error}
        onConfirm={confirmDeactivate}
      >
        <Text variant="body">
          {`${deactivating?.name ?? 'Produk ini'} akan hilang dari katalog kasir dan tidak bisa dijual lagi.`}
        </Text>
      </DeactivateDialog>

      {/* Reading stock is not managing it: the drawer's Sesuaikan link belongs to
          `inventory`, a separate row of the matrix — which this screen's roles
          also manage. */}
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

      <AdjustStockDialog
        target={adjustTarget}
        open={adjustTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAdjustTarget(null);
        }}
      />
    </div>
  );
}

function EmptyState({
  filtered,
  onClearFilters,
  onCreate,
}: {
  filtered: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center gap-md py-3xl">
        <Text variant="body" tone="muted">
          Tidak ada produk yang cocok dengan pencarian Anda.
        </Text>
        <Button variant="ghost" onClick={onClearFilters}>
          <Text>Hapus filter</Text>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-md py-3xl">
      <Text variant="h3">Belum ada produk</Text>
      <Text variant="body" tone="muted">
        Tambahkan produk pertama Anda untuk mulai berjualan.
      </Text>
      <Button onClick={onCreate}>
        <Text>+ Tambah Produk</Text>
      </Button>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[0, 1, 2, 3, 4].map((index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
