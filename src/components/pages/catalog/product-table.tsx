/**
 * S-11's data table, and its stacked-card form below tablet.
 *
 * `rowMenu` is the whole read-only story: a session that may not manage the
 * catalog is given no menu builder, so there is no Aksi column and no `⋯`
 * trigger in the tree — not a disabled one. The page decides that once, from the
 * role matrix; this component only honours it.
 *
 * An inactive product renders at 60% opacity with a NONAKTIF badge. The opacity
 * is decoration; the badge is the information.
 */

import * as React from 'react';

import { RowMenu, type RowMenuItem } from '@/components/ui/row-menu';
import { Text } from '@/components/ui/text';
import { CategoryBadge, StatusBadge } from '@/components/pages/catalog/catalog-badges';
import { ProductIdentity } from '@/components/pages/catalog/product-identity';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { Product } from '@/services/products';
import { formatIDR } from '@/lib/money';
import { cn } from '@/lib/utils';

export type CatalogRow = {
  product: Product;
  /** Active product, deactivated (or missing) category — invisible to cashiers. */
  hiddenByCategory: boolean;
};

export type ProductTableProps = {
  rows: CatalogRow[];
  /** Absent for a read-only session: no menu and no action column at all. */
  rowMenu?: ((product: Product) => RowMenuItem[]) | undefined;
  onOpenStock: (product: Product) => void;
};

export function ProductTable({ rows, rowMenu, onOpenStock }: ProductTableProps) {
  const stacked = useBreakpoint() === 'mobile';

  if (stacked) {
    return (
      <div className="flex flex-col gap-md">
        {rows.map(({ product, hiddenByCategory }) => (
          <div
            key={product.productId}
            className={cn(
              'flex flex-col gap-sm rounded-md border border-border p-md',
              product.status !== 'ACTIVE' && 'opacity-60'
            )}
          >
            <div className="flex flex-row items-start justify-between gap-md">
              <ProductIdentity
                product={product}
                onOpenStock={onOpenStock}
                warnCategory={hiddenByCategory}
                className="flex-1"
              />
              <div className="flex flex-row items-center gap-sm">
                <Text variant="mono">{formatIDR(product.price)}</Text>
                {rowMenu && (
                  <RowMenu label={`Menu untuk ${product.name}`} items={rowMenu(product)} />
                )}
              </div>
            </div>

            <div className="flex flex-row flex-wrap items-center gap-sm">
              <Text variant="mono" tone="muted">
                {product.sku || '—'}
              </Text>
              <CategoryBadge name={product.category?.name ?? null} />
              <StatusBadge status={product.status} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-row gap-md border-b border-border pb-sm">
        <Head className="flex-[3]">Produk</Head>
        <Head className="flex-1">SKU</Head>
        <Head className="flex-1">Kategori</Head>
        <Head className="flex-1 justify-end">Harga</Head>
        <Head className="flex-1">Status</Head>
        {rowMenu ? <Head className="w-touch shrink-0">Aksi</Head> : null}
      </div>

      {rows.map(({ product, hiddenByCategory }) => (
        <div
          key={product.productId}
          className={cn(
            'flex flex-row items-center gap-md border-b border-border py-md',
            product.status !== 'ACTIVE' && 'opacity-60'
          )}
        >
          <div className="min-w-0 flex-[3]">
            <ProductIdentity
              product={product}
              onOpenStock={onOpenStock}
              warnCategory={hiddenByCategory}
            />
          </div>

          <div className="min-w-0 flex-1">
            <Text variant="mono" tone="muted" className="block truncate">
              {product.sku || '—'}
            </Text>
          </div>

          <div className="min-w-0 flex-1">
            <CategoryBadge name={product.category?.name ?? null} />
          </div>

          <div className="flex flex-1 justify-end">
            <Text variant="mono">{formatIDR(product.price)}</Text>
          </div>

          <div className="flex-1">
            <StatusBadge status={product.status} />
          </div>

          {rowMenu ? (
            <div className="w-touch shrink-0">
              <RowMenu label={`Menu untuk ${product.name}`} items={rowMenu(product)} />
            </div>
          ) : null}
        </div>
      ))}
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
