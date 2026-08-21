/**
 * One product in the POS grid.
 *
 * Memoised and given a fixed height: this renders hundreds of times during a
 * search, and the grid's column sizing depends on the height being known
 * without measuring.
 *
 * Everything a cashier needs to decide is on the tile — name, price, and how
 * many are left — and an out-of-stock tile is inert rather than merely
 * discouraging, so a mis-tap cannot start a sale that will fail at checkout.
 */

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import type { PosProduct } from '@/lib/pos-catalog';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';

/** Fixed so the grid can compute row offsets without measuring. */
export const TILE_HEIGHT = 140;

type ProductTileProps = {
  product: PosProduct;
  /** Units of this product already in the cart; 0 hides the count circle. */
  inCart: number;
  onPress: (product: PosProduct) => void;
};

function ProductTileComponent({ product, inCart, onPress }: ProductTileProps) {
  /**
   * Two states, not three. §4.2's cashier catalogue reports `stock_quantity`
   * and no threshold — "menipis" is an Admin judgement made against a
   * per-outlet threshold the till has no endpoint for. So the tile says
   * "available" or "habis", which is the part it can know.
   */
  const level = product.stock <= 0 ? 'out' : 'ok';
  const soldOut = level === 'out';

  return (
    <button
      type="button"
      role="button"
      disabled={soldOut}
      aria-label={accessibilityLabel(product, inCart, soldOut)}
      onClick={() => onPress(product)}
      style={{ height: TILE_HEIGHT }}
      className={cn(
        // `relative` anchors the count circle below. Without it the circle is
        // positioned against the viewport instead of the tile and lands in the
        // top-right corner of the screen, one per product in the cart.
        'relative flex w-full flex-col justify-between rounded-lg border border-border bg-surface p-md text-left',
        'transition-transform focus-ring active:scale-[0.97]',
        soldOut
          ? // Inert, not just dimmed: no press state at all.
            'cursor-not-allowed opacity-45'
          : 'hover:border-border-strong'
      )}
    >
      {inCart > 0 && (
        <span className="absolute right-sm top-sm flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-xs">
          <Text variant="caption" tone="on-accent">
            {formatCount(inCart)}
          </Text>
        </span>
      )}

      <Text variant="body-strong" className="block pr-2xl">
        {product.name}
      </Text>

      <div className="flex flex-col gap-xs">
        <Text variant="h3" tone="accent" className="tabular-nums">
          {formatIDR(product.price)}
        </Text>

        {soldOut ? (
          <Badge variant="danger">
            <Text>HABIS</Text>
          </Badge>
        ) : (
          // Never colour alone: the number is always spelled out.
          <Text variant="caption" tone="subtle">
            Stok: {formatCount(product.stock)}
          </Text>
        )}
      </div>
    </button>
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
    previous.onPress === next.onPress
);
