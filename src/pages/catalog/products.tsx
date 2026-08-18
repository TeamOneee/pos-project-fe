/**
 * S-11 · Produk.
 *
 * `GET /products` filters and pages server-side, so this screen's state *is* the
 * query: search, category and status go into the request, and any change to them
 * resets to page one. The view toggle is the exception — it redraws the page that
 * already arrived.
 *
 * Two behaviours worth naming:
 *
 *   • An active product whose category was deactivated stays in this list, at
 *     full opacity, marked KATEGORI NONAKTIF. Deactivating a category does not
 *     cascade, and the Admin has to be able to find the affected products — which
 *     is impossible if the screen quietly filters them out. The POS applies the
 *     same rule in the other direction (it hides them); both read it from
 *     lib/catalog-visibility so they cannot drift apart.
 *   • Every mutation affordance sits inside `IfCan`, and the mutation hooks are
 *     guarded by the same matrix, so the Owner's variant has no create button, no
 *     row menu and no reachable write — not a disabled one.
 */

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import type { RowMenuItem } from '@/components/ui/row-menu';
import { IfCan } from '@/components/pages/auth/if-can';
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
import { useCan } from '@/hooks/use-can';
import { useCategories } from '@/hooks/use-categories';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDeactivateProduct, useProducts } from '@/hooks/use-products';
import type { Product } from '@/services/products';
import { activeCategoryIndex, isHiddenByCategory } from '@/lib/catalog-visibility';

/** The brief's pagination footer counts in tens. */
const PAGE_LIMIT = 10;

export default function ProductsPage() {
  const editable = useCan('catalog', 'manage');
  const canAdjustStock = useCan('inventory', 'manage');
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
    ...(query.status ? { status: query.status } : {}),
    page,
    size: PAGE_LIMIT,
  });
  const categories = useCategories();
  const deactivate = useDeactivateProduct();

  // A filter change invalidates the page number: page 4 of a narrower list is
  // usually empty, which looks like "no results" for the wrong reason.
  const filterKey = `${search}|${query.categoryId ?? ''}|${query.status ?? ''}`;
  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const activeCategories = React.useMemo(
    () => activeCategoryIndex(categories.data?.items ?? []),
    [categories.data]
  );

  const rows = React.useMemo<CatalogRow[]>(
    () =>
      (products.data?.items ?? []).map((product) => ({
        product,
        // Only meaningful for a product that is itself active — an inactive
        // product is already absent from the POS for its own reasons.
        hiddenByCategory:
          product.isActive && isHiddenByCategory(product, activeCategories),
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
   * The row menu, built only for a session that may manage the catalog. Handed
   * to the table as a builder so a read-only session gets no menu at all rather
   * than an empty one — see ProductTable.
   */
  const rowMenu = editable
    ? (product: Product): RowMenuItem[] => [
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
      ]
    : undefined;

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
        <IfCan
          resource="catalog"
          access="manage"
          fallback={
            <Text variant="body" tone="muted">
              Tampilan hanya-baca. Katalog dikelola oleh Admin.
            </Text>
          }
        >
          <Text variant="body" tone="muted">
            Katalog produk merchant Anda.
          </Text>
        </IfCan>

        <IfCan resource="catalog" access="manage">
          <Button className="shrink-0" onClick={() => openEditor(null)}>
            <Text>+ Tambah Produk</Text>
          </Button>
        </IfCan>
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
                <ProductTable rows={rows} rowMenu={rowMenu} onOpenStock={openStock} />
              ) : (
                <ProductGrid rows={rows} rowMenu={rowMenu} onOpenStock={openStock} />
              )}

              <PaginationFooter
                page={products.data?.page ?? page}
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

      {/* Editing and deactivating exist only for a session that may manage. */}
      <IfCan resource="catalog" access="manage">
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
          // The record is named in the title, not just in the body.
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
      </IfCan>

      {/* Reading stock is not managing it: both roles get the drawer. The
          Sesuaikan links inside it belong to `inventory`, a separate row of the
          matrix, so the drawer asks about that one rather than about `catalog`. */}
      <StockPerOutletDrawer
        product={drawerProduct}
        open={drawerProduct !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerProduct(null);
        }}
        onAdjust={
          canAdjustStock
            ? (target) => {
                setDrawerProduct(null);
                setAdjustTarget(target);
              }
            : undefined
        }
      />

      {canAdjustStock && (
        <AdjustStockDialog
          target={adjustTarget}
          open={adjustTarget !== null}
          onOpenChange={(open) => {
            if (!open) setAdjustTarget(null);
          }}
        />
      )}
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
      <IfCan resource="catalog" access="manage">
        <Button onClick={onCreate}>
          <Text>+ Tambah Produk</Text>
        </Button>
      </IfCan>
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
