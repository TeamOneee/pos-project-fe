import { create } from 'zustand';

import { lineTotal, sumRupiah, type Rupiah } from '@/lib/money';

/**
 * Cart state — the only thing Zustand holds. Everything else is server state
 * and belongs to TanStack Query (CLAUDE.md § Stack).
 *
 * Prices are integer rupiah from the moment they cross the API boundary; this
 * store never sees a decimal string and never does float arithmetic.
 */
export type CartLine = {
  productId: string;
  name: string;
  /** Integer rupiah. */
  unitPrice: Rupiah;
  quantity: number;
  /** Stock at the cashier's outlet, so the stepper can stop at the ceiling. */
  availableStock: number;
};

type CartState = {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  removeLine: (productId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()((set) => ({
  lines: [],

  addLine: (line, quantity = 1) =>
    set((state) => {
      const existing = state.lines.find((item) => item.productId === line.productId);

      if (!existing) {
        return {
          lines: [...state.lines, { ...line, quantity: clamp(quantity, 0, line.availableStock) }],
        };
      }

      return {
        lines: state.lines.map((item) =>
          item.productId === line.productId
            ? { ...item, quantity: clamp(item.quantity + quantity, 0, item.availableStock) }
            : item
        ),
      };
    }),

  setQuantity: (productId, quantity) =>
    set((state) => ({
      lines: state.lines
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: clamp(quantity, 0, item.availableStock) }
            : item
        )
        .filter((item) => item.quantity > 0),
    })),

  increment: (productId) =>
    set((state) => ({
      lines: state.lines.map((item) =>
        item.productId === productId
          ? { ...item, quantity: clamp(item.quantity + 1, 0, item.availableStock) }
          : item
      ),
    })),

  decrement: (productId) =>
    set((state) => ({
      lines: state.lines
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0),
    })),

  removeLine: (productId) =>
    set((state) => ({ lines: state.lines.filter((item) => item.productId !== productId) })),

  clear: () => set({ lines: [] }),
}));

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.trunc(value), min), max);
}

/**
 * Cart subtotal in integer rupiah.
 *
 * Total = subtotal. There is no discount, tax, or service charge in this
 * product (CLAUDE.md rule 2), so no other selector exists on purpose.
 */
export function selectSubtotal(state: CartState): Rupiah {
  return sumRupiah(state.lines.map((line) => lineTotal(line.unitPrice, line.quantity)));
}

/** Total item count, for the cart badge. */
export function selectItemCount(state: CartState): number {
  return state.lines.reduce((count, line) => count + line.quantity, 0);
}
