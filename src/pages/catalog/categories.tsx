/** S-13 · Kategori. */

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RowMenu, type RowMenuItem } from '@/components/ui/row-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { StatusBadge } from '@/components/pages/catalog/catalog-badges';
import { CategoryDialog } from '@/components/pages/catalog/category-dialog';
import { DeactivateDialog, HISTORY_PRESERVED } from '@/components/pages/catalog/deactivate-dialog';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useCategories, useDeactivateCategory } from '@/hooks/use-categories';
import { useProducts } from '@/hooks/use-products';
import type { Category } from '@/services/categories';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';

/** One page wide enough to count every product against its category. */
const COUNT_LIMIT = 500;

export default function CategoriesPage() {
  const stacked = useBreakpoint() === 'mobile';
  const { toast } = useToast();

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [deactivating, setDeactivating] = React.useState<Category | null>(null);

  const categories = useCategories();
  const products = useProducts({ size: COUNT_LIMIT });
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

  const rows = categories.data?.items ?? [];

  const openEditor = (category: Category | null) => {
    setEditing(category);
    setEditorOpen(true);
  };

  const rowMenu = (category: Category): RowMenuItem[] => [
    { label: 'Edit', onSelect: () => openEditor(category) },
    ...(category.isActive
      ? [
          {
            label: 'Nonaktifkan',
            tone: 'danger' as const,
            onSelect: () => setDeactivating(category),
          },
        ]
      : []),
  ];

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

  const countLabel = (categoryId: string) =>
    products.isPending ? '…' : formatCount(counts.get(categoryId) ?? 0);

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      <div className="flex flex-col gap-md tablet:flex-row tablet:items-start tablet:justify-between">
        <Text variant="body" tone="muted">
          Kelompokkan produk agar mudah dicari di kasir.
        </Text>

        <Button className="shrink-0" onClick={() => openEditor(null)}>
          <Text>+ Tambah Kategori</Text>
        </Button>
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
              <Button onClick={() => openEditor(null)}>
                <Text>+ Tambah Kategori</Text>
              </Button>
            </div>
          ) : stacked ? (
            // Below tablet: the name and the count stay, status and menu demote to the second line
            // (brief §7.3).
            <div className="flex flex-col gap-md">
              {rows.map((category) => (
                <div
                  key={category.categoryId}
                  className={cn(
                    'flex flex-col gap-sm rounded-md border border-border p-md',
                    !category.isActive && 'opacity-60'
                  )}
                >
                  <div className="flex flex-row items-center justify-between gap-md">
                    <Text variant="body-strong" className="min-w-0 flex-1 truncate">
                      {category.name}
                    </Text>
                    <Text variant="mono" tone="muted">
                      {countLabel(category.categoryId)}
                    </Text>
                  </div>

                  <div className="flex flex-row items-center justify-between gap-md">
                    <div className="flex flex-row items-center gap-sm">
                      <Text variant="caption" tone="subtle">
                        Jumlah produk
                      </Text>
                      <StatusBadge status={category.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                    <RowMenu label={`Menu untuk ${category.name}`} items={rowMenu(category)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="flex flex-row gap-md border-b border-border pb-sm">
                <Head className="flex-[2]">Nama Kategori</Head>
                <Head className="flex-1 justify-end">Jumlah Produk</Head>
                <Head className="flex-1">Status</Head>
                <Head className="w-touch shrink-0">Aksi</Head>
              </div>

              {rows.map((category) => (
                <div
                  key={category.categoryId}
                  className={cn(
                    'flex flex-row items-center gap-md border-b border-border py-md',
                    !category.isActive && 'opacity-60'
                  )}
                >
                  <div className="min-w-0 flex-[2]">
                    <Text variant="body-strong" className="block truncate">
                      {category.name}
                    </Text>
                  </div>

                  <div className="flex flex-1 justify-end">
                    <Text variant="mono" tone="muted">
                      {countLabel(category.categoryId)}
                    </Text>
                  </div>

                  <div className="flex-1">
                    <StatusBadge status={category.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </div>

                  <div className="w-touch shrink-0">
                    <RowMenu label={`Menu untuk ${category.name}`} items={rowMenu(category)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
        title={`Nonaktifkan kategori ${deactivating?.name ?? 'ini'}?`}
        preserved={`${HISTORY_PRESERVED} Produknya juga tetap ada dan bisa dipulihkan dengan mengaktifkan kategori ini kembali.`}
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
