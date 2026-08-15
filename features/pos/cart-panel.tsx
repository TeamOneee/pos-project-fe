/**
 * The cart panel: header, scrollable lines, sticky totals.
 *
 * Total equals subtotal (CLAUDE.md rule 2). There is no discount, tax or
 * service charge row here, and there must never be one — if this block ever
 * grows a third figure, that is a bug.
 *
 * The amount is repeated on the pay button because reading it there, rather
 * than glancing back up at the total, is what stops a cashier taking the wrong
 * money.
 */

import { ShoppingCart } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { CartLineRow } from '@/features/pos/cart-line-row';
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
  showHeader = true,
}: CartPanelProps) {
  const empty = lines.length === 0;

  const renderItem = React.useCallback(
    ({ item }: { item: CartLine }) => (
      <CartLineRow
        line={item}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onRemove={onRemove}
      />
    ),
    [onIncrement, onDecrement, onRemove]
  );

  return (
    <View className="flex-1 bg-surface">
      {showHeader && (
        <View className="h-16 flex-row items-center justify-between gap-md border-b border-border px-lg">
          <View className="flex-row items-center gap-sm">
            <Text variant="h2">Keranjang</Text>
            {itemCount > 0 && (
              <Badge variant="neutral">
                <Text>{formatCount(itemCount)}</Text>
              </Badge>
            )}
          </View>

          {!empty && (
            <Button variant="ghost" size="sm" onPress={onClear}>
              <Text className="text-danger">Kosongkan</Text>
            </Button>
          )}
        </View>
      )}

      {empty ? (
        <CartEmpty />
      ) : (
        <FlatList
          data={lines}
          renderItem={renderItem}
          keyExtractor={(line) => line.productId}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View className="gap-md border-t border-border p-lg">
        <View className="flex-row items-center justify-between">
          <Text variant="body" tone="muted">
            Subtotal
          </Text>
          <Text variant="mono">{formatIDR(subtotal)}</Text>
        </View>

        <Separator />

        <View className="flex-row items-center justify-between gap-md">
          <Text variant="h2">Total</Text>
          {/* The biggest number on the screen, by design. */}
          <Text variant="mono" className="type-display" numberOfLines={1}>
            {formatIDR(subtotal)}
          </Text>
        </View>

        <Button
          size="lg"
          disabled={empty}
          onPress={onPay}
          className="h-14"
          accessibilityLabel={`Bayar ${formatIDR(subtotal)}`}
        >
          <Text>Bayar · {formatIDR(subtotal)}</Text>
        </Button>
      </View>
    </View>
  );
}

function CartEmpty() {
  return (
    <View className="flex-1 items-center justify-center gap-md p-xl">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-subtle">
        <Icon as={ShoppingCart} size={28} className="text-fg-subtle" />
      </View>
      <Text variant="h3">Keranjang kosong</Text>
      <Text variant="body" tone="muted" className="text-center">
        Pilih produk di sebelah kiri untuk memulai transaksi.
      </Text>
    </View>
  );
}
