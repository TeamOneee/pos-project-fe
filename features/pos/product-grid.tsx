/**
 * The POS product grid.
 *
 * Virtualised, because the catalogue runs to a few hundred products and the
 * search filters it on every keystroke. A FlatList with a known row height
 * keeps that to a handful of mounted tiles no matter how long the list is.
 *
 * The row is padded out to a whole number of columns so the last row's tiles
 * keep their width instead of stretching across the gap.
 */

import * as React from 'react';
import { FlatList, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { PosProduct } from '@/features/pos/pos-catalog';
import { ProductTile, TILE_HEIGHT } from '@/features/pos/product-tile';

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
  header?: React.ReactElement;
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
  const data = React.useMemo(() => padToColumns(products, columns), [products, columns]);

  const renderItem = React.useCallback(
    ({ item }: { item: GridEntry }) => (
      <View className="flex-1 p-sm">
        {item.product && (
          <ProductTile
            product={item.product}
            inCart={quantities[item.product.productId] ?? 0}
            threshold={threshold}
            onPress={onSelect}
          />
        )}
      </View>
    ),
    [quantities, threshold, onSelect]
  );

  const getItemLayout = React.useCallback(
    (_data: ArrayLike<GridEntry> | null | undefined, index: number) => ({
      length: ROW_HEIGHT,
      // numColumns groups items into rows, so the offset is per row.
      offset: ROW_HEIGHT * Math.floor(index / columns),
      index,
    }),
    [columns]
  );

  return (
    <FlatList
      // numColumns cannot change on a mounted list; remounting on the
      // breakpoint change is the supported way to switch it.
      key={`pos-grid-${columns}`}
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.key}
      numColumns={columns}
      getItemLayout={getItemLayout}
      initialNumToRender={columns * 4}
      maxToRenderPerBatch={columns * 4}
      windowSize={5}
      removeClippedSubviews
      // Tapping a tile must not first dismiss the keyboard and swallow the tap.
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="none"
      contentContainerClassName="p-sm"
      ListHeaderComponent={header}
      ListEmptyComponent={<GridEmpty title={emptyTitle} description={emptyDescription} />}
    />
  );
}

/** Fills the final row so its tiles keep the same width as every other row. */
function padToColumns(products: PosProduct[], columns: number): GridEntry[] {
  const entries: GridEntry[] = products.map((product) => ({
    key: product.productId,
    product,
  }));

  const remainder = entries.length % columns;
  if (remainder === 0) return entries;

  for (let index = remainder; index < columns; index += 1) {
    entries.push({ key: `filler-${index}`, product: null });
  }

  return entries;
}

function GridEmpty({ title, description }: { title: string; description: string }) {
  return (
    <View className="items-center gap-xs p-3xl">
      <Text variant="h3" className="text-center">
        {title}
      </Text>
      <Text variant="body" tone="muted" className="text-center">
        {description}
      </Text>
    </View>
  );
}
