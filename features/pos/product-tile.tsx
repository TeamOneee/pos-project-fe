/**
 * One product in the POS grid.
 *
 * Memoised and given a fixed height: this renders hundreds of times during a
 * search, and the grid's virtualisation depends on the height being known
 * without measuring.
 *
 * Everything a cashier needs to decide is on the tile — name, price, and how
 * many are left — and an out-of-stock tile is inert rather than merely
 * discouraging, so a mis-tap cannot start a sale that will fail at checkout.
 */

import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import type { PosProduct } from '@/features/pos/pos-catalog';
import { stockLevel } from '@/features/pos/stock';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';

/** Fixed so the grid can compute row offsets without measuring. */
export const TILE_HEIGHT = 140;

type ProductTileProps = {
  product: PosProduct;
  /** Units of this product already in the cart; 0 hides the count circle. */
  inCart: number;
  threshold: number;
  onPress: (product: PosProduct) => void;
};

function ProductTileComponent({ product, inCart, threshold, onPress }: ProductTileProps) {
  const level = stockLevel(product.stock, threshold);
  const soldOut = level === 'out';

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={animatedStyle} className="flex-1">
      <Pressable
        role="button"
        disabled={soldOut}
        accessibilityState={{ disabled: soldOut }}
        accessibilityLabel={accessibilityLabel(product, inCart, soldOut)}
        onPressIn={() => {
          scale.set(withTiming(0.96, { duration: 80 }));
        }}
        onPressOut={() => {
          scale.set(withTiming(1, { duration: 120 }));
        }}
        onPress={() => onPress(product)}
        style={{ height: TILE_HEIGHT }}
        className={cn(
          'justify-between rounded-lg border border-border bg-surface p-md',
          soldOut
            ? // Inert, not just dimmed: no press state at all.
              'opacity-45'
            : 'active:border-accent web:hover:border-border-strong'
        )}
      >
        {inCart > 0 && (
          <View className="absolute right-sm top-sm h-6 min-w-6 items-center justify-center rounded-full bg-accent px-xs">
            <Text variant="caption" tone="on-accent">
              {formatCount(inCart)}
            </Text>
          </View>
        )}

        <Text variant="body-strong" numberOfLines={2} className="pr-2xl">
          {product.name}
        </Text>

        <View className="gap-xs">
          <Text variant="mono" tone="accent" className="type-h3">
            {formatIDR(product.price)}
          </Text>

          {soldOut ? (
            <Badge variant="danger">
              <Text>HABIS</Text>
            </Badge>
          ) : (
            // Never colour alone: the number is always spelled out.
            <Text variant="caption" tone={level === 'low' ? 'warning' : 'subtle'}>
              Stok: {formatCount(product.stock)}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function accessibilityLabel(product: PosProduct, inCart: number, soldOut: boolean): string {
  const price = formatIDR(product.price);
  if (soldOut) return `${product.name}, ${price}, stok habis`;
  if (inCart > 0) return `${product.name}, ${price}, ${inCart} di keranjang`;
  return `${product.name}, ${price}`;
}

/**
 * Re-renders only when something visible changes. Without this, one keystroke
 * would re-render every tile in the catalogue.
 */
export const ProductTile = React.memo(
  ProductTileComponent,
  (previous, next) =>
    previous.product.productId === next.product.productId &&
    previous.product.stock === next.product.stock &&
    previous.product.price === next.product.price &&
    previous.product.name === next.product.name &&
    previous.inCart === next.inCart &&
    previous.threshold === next.threshold &&
    previous.onPress === next.onPress
);
