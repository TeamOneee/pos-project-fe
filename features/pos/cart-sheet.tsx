/**
 * The mobile cart: a fixed summary bar, and a sheet that expands to 85% height.
 *
 * Below 768 the cart cannot sit beside the grid, and stacking it underneath
 * would bury the running total under a scroll. The bar keeps the two facts a
 * cashier needs — how many items and how much — permanently on screen, and the
 * sheet is one tap away.
 *
 * The sheet stays mounted and translated off-screen so both directions
 * animate; it is inert while closed.
 */

import { ChevronDown } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { CartPanel } from '@/features/pos/cart-panel';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';
import type { CartLine } from '@/stores/cart';

const SHEET_RATIO = 0.85;
const DURATION = 220;

type CartSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onPay: () => void;
};

/** The always-visible summary bar. */
export function MobileCartBar({
  itemCount,
  subtotal,
  onOpen,
}: {
  itemCount: number;
  subtotal: number;
  onOpen: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-md border-t border-border bg-surface px-lg py-md">
      <View className="min-w-0 flex-1 gap-xs">
        <Text variant="caption" tone="muted">
          {formatCount(itemCount)} item
        </Text>
        <Text variant="mono" className="type-h3" numberOfLines={1}>
          {formatIDR(subtotal)}
        </Text>
      </View>

      <Button onPress={onOpen} accessibilityLabel="Lihat keranjang">
        <Text>Lihat Keranjang</Text>
      </Button>
    </View>
  );
}

export function CartSheet({ open, onOpenChange, ...cart }: CartSheetProps) {
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * SHEET_RATIO);

  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    translateY.set(withTiming(open ? 0 : sheetHeight, { duration: DURATION }));
    backdropOpacity.set(withTiming(open ? 1 : 0, { duration: DURATION }));
  }, [open, sheetHeight, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.get() }));

  return (
    <>
      {open && (
        <Animated.View
          style={backdropStyle}
          className="absolute bottom-0 left-0 right-0 top-0 z-40 bg-black/50"
        >
          <Pressable
            accessibilityLabel="Tutup keranjang"
            className="flex-1"
            onPress={() => onOpenChange(false)}
          />
        </Animated.View>
      )}

      <Animated.View
        style={[sheetStyle, { height: sheetHeight }]}
        pointerEvents={open ? 'auto' : 'none'}
        accessibilityViewIsModal={open}
        className="absolute bottom-0 left-0 right-0 z-50 overflow-hidden rounded-t-lg border-t border-border bg-surface"
      >
        <View className="h-16 flex-row items-center justify-between gap-md border-b border-border px-lg">
          <Text variant="h2">Keranjang</Text>
          <Pressable
            role="button"
            accessibilityLabel="Tutup keranjang"
            onPress={() => onOpenChange(false)}
            className="h-touch w-touch items-center justify-center rounded-md active:bg-subtle"
          >
            <Icon as={ChevronDown} size={20} className="text-fg-muted" />
          </Pressable>
        </View>

        {/* Same panel as tablet and desktop, minus its own header. */}
        <CartPanel {...cart} showHeader={false} />
      </Animated.View>
    </>
  );
}
