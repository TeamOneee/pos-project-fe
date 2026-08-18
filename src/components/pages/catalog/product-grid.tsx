/**
 * S-11's grid view — the same rows, laid out as cards.
 *
 * Table is the default because the catalog is read for facts (which SKU, what
 * price, active or not) and a table beats a grid at that. The grid exists for the
 * other pass: scanning the shape of the catalog, spotting the products nobody has
 * priced or the block of inactive ones. It carries the same fields, the same
 * badges and the same permission story as the table — `rowMenu` absent means no
 * menu anywhere in the card.
 */

import { RowMenu, type RowMenuItem } from '@/components/ui/row-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import {
  CategoryBadge,
  InactiveCategoryBadge,
  ActiveBadge,
} from '@/components/pages/catalog/catalog-badges';
import { ProductThumb } from '@/components/pages/catalog/product-identity';
import type { CatalogRow } from '@/components/pages/catalog/product-table';
import type { Product } from '@/services/products';
import { formatIDR } from '@/lib/money';
import { cn } from '@/lib/utils';

export function ProductGrid({
  rows,
  rowMenu,
  onOpenStock,
}: {
  rows: CatalogRow[];
  rowMenu?: ((product: Product) => RowMenuItem[]) | undefined;
  onOpenStock: (product: Product) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-md tablet:grid-cols-2 desktop:grid-cols-3">
      {rows.map(({ product, hiddenByCategory }) => (
        <Card
          key={product.productId}
          className={cn('h-full', !product.isActive && 'opacity-60')}
        >
          <CardContent className="flex flex-col gap-md pt-lg">
            <div className="flex flex-row items-start justify-between gap-sm">
              <button
                type="button"
                onClick={() => onOpenStock(product)}
                aria-label={`Lihat stok ${product.name} per outlet`}
                className="flex min-w-0 flex-1 flex-row items-center gap-md rounded-md text-left focus-ring"
              >
                <ProductThumb name={product.name} size={48} />
                <span className="flex min-w-0 flex-col">
                  <Text
                    variant="body-strong"
                    className="block truncate underline-offset-2 hover:underline"
                  >
                    {product.name}
                  </Text>
                  {/* §3.4 has no SKU; the low-stock threshold is the second
                      identifying number a catalogue card can honestly show. */}
                  <Text variant="caption" tone="subtle" className="block truncate">
                    {`Batas stok ${product.lowStockThreshold}`}
                  </Text>
                </span>
              </button>

              {rowMenu && <RowMenu label={`Menu untuk ${product.name}`} items={rowMenu(product)} />}
            </div>

            <Text variant="h3" className="tabular-nums">
              {formatIDR(product.price)}
            </Text>

            <div className="flex flex-row flex-wrap items-center gap-sm">
              <CategoryBadge name={product.categoryName} />
              <ActiveBadge active={product.isActive} />
              {hiddenByCategory && <InactiveCategoryBadge />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
