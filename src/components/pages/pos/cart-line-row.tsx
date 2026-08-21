/** One line in the POS cart. */

import { Minus, Plus, X } from 'lucide-react';
import * as React from 'react';

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
    <div
      className={cn(
        'flex flex-row items-start gap-md border-b border-border px-lg py-md',
        flagged && 'bg-danger-subtle'
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <Text variant="body-strong" className="block">
          {line.name}
        </Text>
        {/* Unit price × quantity, so the arithmetic is checkable at a glance. */}
        <Text variant="caption" tone="muted" className="tabular-nums">
          {formatIDR(line.unitPrice)} × {formatCount(line.quantity)}
        </Text>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-xs">
        <div className="flex flex-row items-center gap-xs">
          <StepperButton
            icon={Minus}
            label={`Kurangi ${line.name}`}
            disabled={line.quantity <= 1}
            onPress={() => onDecrement(line.productId)}
          />
          <Text variant="body-strong" className="min-w-8 text-center tabular-nums">
            {formatCount(line.quantity)}
          </Text>
          <StepperButton
            icon={Plus}
            label={`Tambah ${line.name}`}
            disabled={atCeiling}
            onPress={() => onIncrement(line.productId)}
          />
        </div>

        <Text variant="body-strong" className="tabular-nums">
          {formatIDR(lineTotal(line.unitPrice, line.quantity))}
        </Text>
      </div>

      <button
        type="button"
        aria-label={`Hapus ${line.name} dari keranjang`}
        onClick={() => onRemove(line.productId)}
        className="flex h-touch w-touch shrink-0 items-center justify-center rounded-md outline-none hover:bg-subtle focus-ring"
      >
        <Icon as={X} size={18} className="text-fg-subtle" />
      </button>
    </div>
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
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      className={cnStepper(disabled)}
    >
      <Icon as={icon} size={18} className={disabled ? 'text-fg-subtle' : 'text-fg'} />
    </button>
  );
}

function cnStepper(disabled: boolean): string {
  return [
    'flex h-touch w-touch items-center justify-center rounded-md border border-border focus-ring',
    disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-subtle',
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
