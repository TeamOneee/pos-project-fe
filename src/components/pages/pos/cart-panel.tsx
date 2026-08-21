/** The cart panel: header, scrollable lines, sticky totals. */

import { ShoppingCart } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { CartLineRow } from '@/components/pages/pos/cart-line-row';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';
import type { CartLine } from '@/stores/cart';

type CartPanelProps = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onPay: () => void;
  /** Products checkout rejected for stock; their lines are tinted (S-18a). */
  flaggedProductIds?: string[];
  /** Hides the header on mobile, where the sheet supplies its own. */
  showHeader?: boolean;
};

export function CartPanel({
  lines,
  itemCount,
  subtotal,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onPay,
  flaggedProductIds,
  showHeader = true,
}: CartPanelProps) {
  const empty = lines.length === 0;

  return (
    <div className="flex h-full flex-col bg-surface">
      {showHeader && (
        <div className="flex h-16 shrink-0 flex-row items-center justify-between gap-md border-b border-border px-lg">
          <div className="flex flex-row items-center gap-sm">
            <Text variant="h2">Keranjang</Text>
            {itemCount > 0 && (
              <Badge variant="neutral">
                <Text>{formatCount(itemCount)}</Text>
              </Badge>
            )}
          </div>

          {!empty && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <Text className="text-danger">Kosongkan</Text>
            </Button>
          )}
        </div>
      )}

      {empty ? (
        <CartEmpty />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {lines.map((line) => (
            <CartLineRow
              key={line.productId}
              line={line}
              flagged={flaggedProductIds?.includes(line.productId) ?? false}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      <div className="flex shrink-0 flex-col gap-md border-t border-border p-lg">
        <div className="flex flex-row items-center justify-between">
          <Text variant="body" tone="muted">
            Subtotal
          </Text>
          <Text variant="mono">{formatIDR(subtotal)}</Text>
        </div>

        <Separator />

        <div className="flex flex-row items-center justify-between gap-md">
          <Text variant="h2">Total</Text>
          {/* The biggest number on the screen, by design. */}
          <Text variant="display" className="truncate tabular-nums">
            {formatIDR(subtotal)}
          </Text>
        </div>

        <Button
          size="lg"
          disabled={empty}
          onClick={onPay}
          className="h-14"
          aria-label={`Bayar ${formatIDR(subtotal)}`}
        >
          <Text>Bayar · {formatIDR(subtotal)}</Text>
        </Button>
      </div>
    </div>
  );
}

function CartEmpty() {
  return (
    <div className="flex flex-1 items-center justify-center gap-md p-xl">
      <div className="flex flex-col items-center gap-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-subtle">
          <Icon as={ShoppingCart} size={28} className="text-fg-subtle" />
        </div>
        <Text variant="h3">Keranjang kosong</Text>
        <Text variant="body" tone="muted" className="text-center">
          Pilih produk di sebelah kiri untuk memulai transaksi.
        </Text>
      </div>
    </div>
  );
}
