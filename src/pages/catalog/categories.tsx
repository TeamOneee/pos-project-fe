/**
 * S-13 · Kategori.
 *
 * Deliberately the plainest screen in the app: four columns and one modal. The
 * only thing here that needs care is the deactivate dialog, because deactivating
 * a category has a consequence somewhere else — its products stay exactly where
 * they are and silently stop being sellable. The dialog states that before the
 * fact; S-11 marks the affected products after it (KATEGORI NONAKTIF), and the
 * POS is where the products actually disappear.
 *
 * `GET /categories` carries no product count, so the count column is joined from
 * a single wide products query rather than one request per row.
 */

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RowMenu, type RowMenuItem } from '@/components/ui/row-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { IfCan } from '@/components/pages/auth/if-can';
import { StatusBadge } from '@/components/pages/catalog/catalog-badges';
import { CategoryDialog } from '@/components/pages/catalog/category-dialog';
import { DeactivateDialog } from '@/components/pages/catalog/deactivate-dialog';
import { useCan } from '@/hooks/use-can';
import { useCategories, useDeactivateCategory } from '@/hooks/use-categories';
import { useProducts } from '@/hooks/use-products';
import type { Category } from '@/services/categories';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';

/**
 * One page wide enough to count every product against its category. The catalog
 * is a few hundred rows at most; a per-category request would be twelve requests
 * to render one column.
 */
const COUNT_LIMIT = 500;

export default function CategoriesPage() {
  const editable = useCan('catalog', 'manage');
  const { toast } = useToast();

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [deactivating, setDeactivating] = React.useState<Category | null>(null);

  const categories = useCategories();
  const products = useProducts({ limit: COUNT_LIMIT });
  const deactivate = useDeactivateCategory();

  /** Products per category id, counting inactive products too — they still hold it. */
  const counts = React.useMemo(() => {
    const tally = new Map<string, number>();
    for (const product of products.data?.items ?? []) {
      if (!product.categoryId) continue;
      tally.set(product.categoryId, (tally.get(product.categoryId) ?? 0) + 1);
    }
    return tally;
  }, [products.data]);

  const rows = categories.data ?? [];

  const openEditor = (category: Category | null) => {
    setEditing(category);
    setEditorOpen(true);
  };

  const rowMenu = editable
    ? (category: Category): RowMenuItem[] => [
        { label: 'Edit', onSelect: () => openEditor(category) },
        ...(category.status === 'ACTIVE'
          ? [
              {
                label: 'Nonaktifkan',
                tone: 'danger' as const,
                onSelect: () => setDeactivating(category),
              },
            ]
          : []),
      ]
    : undefined;

  const confirmDeactivate = () => {
    if (!deactivating) return;
    const name = deactivating.name;

    deactivate.mutate(deactivating.categoryId, {
      onSuccess: () => {
        toast({
          variant: 'success',
          title: 'Kategori dinonaktifkan',
          description: `${name} tidak bisa dipilih untuk produk baru.`,
        });
        setDeactivating(null);
      },
    });
  };

  const deactivatingCount = deactivating ? (counts.get(deactivating.categoryId) ?? 0) : 0;

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
            Kelompokkan produk agar mudah dicari di kasir.
          </Text>
        </IfCan>

        <IfCan resource="catalog" access="manage">
          <Button className="shrink-0" onClick={() => openEditor(null)}>
            <Text>+ Tambah Kategori</Text>
          </Button>
        </IfCan>
      </div>

      <Card>
        <CardContent className="pt-lg">
          {categories.isPending ? (
            <div className="flex flex-col gap-md">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : categories.isError ? (
            <div className="flex items-center justify-center py-3xl">
              <Text variant="body" tone="danger">
                Gagal memuat daftar kategori.
              </Text>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-md py-3xl">
              <Text variant="h3">Belum ada kategori</Text>
              <Text variant="body" tone="muted">
                Kategori pertama Anda membuat produk lebih mudah ditemukan di kasir.
              </Text>
              <IfCan resource="catalog" access="manage">
                <Button onClick={() => openEditor(null)}>
                  <Text>+ Tambah Kategori</Text>
                </Button>
              </IfCan>
            </div>
          ) : (
            <div>
              <div className="flex flex-row gap-md border-b border-border pb-sm">
                <Head className="flex-[2]">Nama Kategori</Head>
                <Head className="flex-1 justify-end">Jumlah Produk</Head>
                <Head className="flex-1">Status</Head>
                {rowMenu ? <Head className="w-touch shrink-0">Aksi</Head> : null}
              </div>

              {rows.map((category) => (
                <div
                  key={category.categoryId}
                  className={cn(
                    'flex flex-row items-center gap-md border-b border-border py-md',
                    category.status !== 'ACTIVE' && 'opacity-60'
                  )}
                >
                  <div className="min-w-0 flex-[2]">
                    <Text variant="body-strong" className="block truncate">
                      {category.name}
                    </Text>
                  </div>

                  <div className="flex flex-1 justify-end">
                    <Text variant="mono" tone="muted">
                      {products.isPending ? '…' : formatCount(counts.get(category.categoryId) ?? 0)}
                    </Text>
                  </div>

                  <div className="flex-1">
                    <StatusBadge status={category.status} />
                  </div>

                  {rowMenu ? (
                    <div className="w-touch shrink-0">
                      <RowMenu label={`Menu untuk ${category.name}`} items={rowMenu(category)} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <IfCan resource="catalog" access="manage">
        <CategoryDialog
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) setEditing(null);
          }}
          category={editing}
        />

        <DeactivateDialog
          open={deactivating !== null}
          onOpenChange={(open) => {
            if (!open) setDeactivating(null);
          }}
          title="Nonaktifkan kategori ini?"
          pending={deactivate.isPending}
          error={deactivate.error}
          onConfirm={confirmDeactivate}
        >
          <Text variant="body">
            {`Kategori ${deactivating?.name ?? 'ini'} tidak akan bisa dipilih untuk produk baru.`}
          </Text>
          <Text variant="body" tone="muted">
            {`${formatCount(deactivatingCount)} produk yang sudah memakai kategori ini tetap ada dan tidak berubah, tetapi hilang dari katalog kasir sampai kategorinya diaktifkan kembali.`}
          </Text>
        </DeactivateDialog>
      </IfCan>
    </div>
  );
}

function Head({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex', className)}>
      <Text variant="caption" tone="subtle">
        {children}
      </Text>
    </div>
  );
}
