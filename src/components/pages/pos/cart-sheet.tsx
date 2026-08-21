/** The mobile cart: a fixed summary bar, and a sheet that expands to 85% height. */

import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { CartPanel } from '@/components/pages/pos/cart-panel';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';
import type { CartLine } from '@/stores/cart';

const SHEET_RATIO = 0.85;

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
    <div className="flex shrink-0 flex-row items-center justify-between gap-md border-t border-border bg-surface px-lg py-md">
      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <Text variant="caption" tone="muted">
          {formatCount(itemCount)} item
        </Text>
        <Text variant="h3" className="truncate tabular-nums">
          {formatIDR(subtotal)}
        </Text>
      </div>

      <Button onClick={onOpen} aria-label="Lihat keranjang">
        <Text>Lihat Keranjang</Text>
      </Button>
    </div>
  );
}

export function CartSheet({ open, onOpenChange, ...cart }: CartSheetProps) {
  return (
    <>
      {/* Backdrop; inert while closed. */}
      <div aria-hidden={!open} onClick={() => onOpenChange(false)} className={cnBackdrop(open)} />

      <div
        aria-hidden={!open}
        className={cnSheet(open)}
        style={{ height: `${SHEET_RATIO * 100}vh` }}
      >
        <div className="flex h-16 shrink-0 flex-row items-center justify-between gap-md border-b border-border px-lg">
          <Text variant="h2">Keranjang</Text>
          <button
            type="button"
            aria-label="Tutup keranjang"
            onClick={() => onOpenChange(false)}
            className="flex h-touch w-touch items-center justify-center rounded-md outline-none hover:bg-subtle focus-ring"
          >
            <Icon as={ChevronDown} size={20} className="text-fg-muted" />
          </button>
        </div>

        {/* Same panel as tablet and desktop, minus its own header. */}
        <CartPanel {...cart} showHeader={false} />
      </div>
    </>
  );
}

function cnBackdrop(open: boolean): string {
  const base =
    'fixed bottom-0 left-0 right-0 top-0 z-40 bg-black/50 transition-opacity duration-200';
  return open ? `${base} opacity-100` : `${base} pointer-events-none opacity-0`;
}

function cnSheet(open: boolean): string {
  const base = [
    'fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden rounded-t-lg border-t border-border bg-surface',
    'transition-transform duration-200 ease-out',
  ].join(' ');
  return open ? `${base} translate-y-0` : `${base} pointer-events-none translate-y-full`;
}
