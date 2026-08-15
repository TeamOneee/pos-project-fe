/**
 * One line in the POS cart.
 *
 * The stepper buttons are 44px rather than the brief's 32px: CLAUDE.md rule 6
 * puts the floor at 44×44 on tablet and mobile and says cart steppers should be
 * larger still, and it wins where the two disagree. These are pressed under
 * time pressure with a queue waiting.
 *
 * The remove control is always visible rather than revealed on hover. The
 * primary form factor is a tablet, where there is no hover to reveal it.
 */

import { Minus, Plus, X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatIDR, lineTotal } from '@/lib/money';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';
import type { CartLine } from '@/stores/cart';

type CartLineRowProps = {
  line: CartLine;
  /** Tinted after checkout rejected this line for stock (S-18a). */
  flagged?: boolean;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
};

function CartLineRowComponent({
  line,
  flagged = false,
  onIncrement,
  onDecrement,
  onRemove,
}: CartLineRowProps) {
  const atCeiling = line.quantity >= line.availableStock;

  return (
    <View
      className={cn(
        'flex-row items-start gap-md border-b border-border px-lg py-md',
        flagged && 'bg-danger-subtle'
      )}
    >
      <View className="min-w-0 flex-1 gap-xs">
        <Text variant="body-strong" numberOfLines={2}>
          {line.name}
        </Text>
        {/* Unit price × quantity, so the arithmetic is auditable at a glance. */}
        <Text variant="mono" tone="muted" className="type-caption">
          {formatIDR(line.unitPrice)} × {formatCount(line.quantity)}
        </Text>
      </View>

      <View className="items-end gap-xs">
        <View className="flex-row items-center gap-xs">
          <StepperButton
            icon={Minus}
            label={`Kurangi ${line.name}`}
            onPress={() => onDecrement(line.productId)}
          />
          <Text variant="mono" className="min-w-8 text-center type-body-strong">
            {formatCount(line.quantity)}
          </Text>
          <StepperButton
            icon={Plus}
            label={`Tambah ${line.name}`}
            disabled={atCeiling}
            onPress={() => onIncrement(line.productId)}
          />
        </View>

        <Text variant="mono" className="type-body-strong">
          {formatIDR(lineTotal(line.unitPrice, line.quantity))}
        </Text>
      </View>

      <Pressable
        role="button"
        accessibilityLabel={`Hapus ${line.name} dari keranjang`}
        onPress={() => onRemove(line.productId)}
        className="h-touch w-touch items-center justify-center rounded-md active:bg-subtle web:hover:bg-subtle"
      >
        <Icon as={X} size={18} className="text-fg-subtle" />
      </Pressable>
    </View>
  );
}

function StepperButton({
  icon,
  label,
  disabled = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cnStepper(disabled)}
    >
      <Icon as={icon} size={18} className={disabled ? 'text-fg-subtle' : 'text-fg'} />
    </Pressable>
  );
}

function cnStepper(disabled: boolean): string {
  return [
    'h-touch w-touch items-center justify-center rounded-md border border-border',
    disabled ? 'opacity-40' : 'active:bg-subtle web:hover:bg-subtle',
  ].join(' ');
}

/** The list re-renders on every quantity change; only the edited row should. */
export const CartLineRow = React.memo(
  CartLineRowComponent,
  (previous, next) =>
    previous.line.productId === next.line.productId &&
    previous.flagged === next.flagged &&
    previous.line.quantity === next.line.quantity &&
    previous.line.unitPrice === next.line.unitPrice &&
    previous.line.availableStock === next.line.availableStock &&
    previous.onIncrement === next.onIncrement &&
    previous.onDecrement === next.onDecrement &&
    previous.onRemove === next.onRemove
);
