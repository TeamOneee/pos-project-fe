/**
 * The POS product grid.
 *
 * A CSS grid with fixed row height. The catalogue runs to a few hundred
 * products and the search filters it on every keystroke, so each tile is
 * memoised and the grid is given a whole number of columns per breakpoint.
 *
 * The row is padded out to a whole number of columns so the last row's tiles
 * keep their width instead of stretching across the gap.
 */

import * as React from 'react';

import { Text } from '@/components/ui/text';
import type { PosProduct } from '@/lib/pos-catalog';
import { ProductTile, TILE_HEIGHT } from '@/components/pages/pos/product-tile';

/** Tile height plus the 8px padding either side, giving the 16px gap. */
const ROW_HEIGHT = TILE_HEIGHT + 16;

type GridEntry = { key: string; product: PosProduct | null };

type ProductGridProps = {
  products: PosProduct[];
  columns: number;
  /** Units per product currently in the cart, for the count circles. */
  quantities: Record<string, number>;
  threshold: number;
  onSelect: (product: PosProduct) => void;
  emptyTitle: string;
  emptyDescription: string;
  header?: React.ReactNode;
};

export function ProductGrid({
  products,
  columns,
  quantities,
  threshold,
  onSelect,
  emptyTitle,
  emptyDescription,
  header,
}: ProductGridProps) {
  const rows = React.useMemo(() => toRows(products, columns), [products, columns]);

  return (
    <div className="flex h-full flex-col">
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <GridEmpty title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="flex flex-col p-sm">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex flex-row" style={{ height: ROW_HEIGHT }}>
                {row.map((entry) => (
                  <div
                    key={entry.key}
                    className="w-full p-sm"
                    style={{ flexBasis: `${100 / columns}%` }}
                  >
                    {entry.product && (
                      <ProductTile
                        product={entry.product}
                        inCart={quantities[entry.product.productId] ?? 0}
                        threshold={threshold}
                        onPress={onSelect}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Groups into rows, filling the final row so tiles keep equal width. */
function toRows(products: PosProduct[], columns: number): GridEntry[][] {
  const entries: GridEntry[] = products.map((product) => ({
    key: product.productId,
    product,
  }));

  const remainder = entries.length % columns;
  if (remainder !== 0) {
    for (let index = remainder; index < columns; index += 1) {
      entries.push({ key: `filler-${index}`, product: null });
    }
  }

  const rows: GridEntry[][] = [];
  for (let index = 0; index < entries.length; index += columns) {
    rows.push(entries.slice(index, index + columns));
  }
  return rows;
}

function GridEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-xs p-3xl">
      <Text variant="h3" className="text-center">
        {title}
      </Text>
      <Text variant="body" tone="muted" className="text-center">
        {description}
      </Text>
    </div>
  );
}
