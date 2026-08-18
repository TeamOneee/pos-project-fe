import { create } from 'zustand';

import { lineTotal, sumRupiah, type Rupiah } from '@/lib/money';

/**
 * Cart state — the only thing Zustand holds. Everything else is server state
 * and belongs to TanStack Query (CLAUDE.md § Stack).
 *
 * Contract §5.2 makes this the *whole* cart: "Cart Iterasi 1 = client-side
 * only… tidak ada endpoint REST `/cart/*`". Nothing here is mirrored on the
 * server, nothing is reconciled with it, and the basket is submitted inline at
 * checkout. A refresh loses it, which is the contract's accepted behaviour.
 *
 * Prices are integer rupiah from the moment they cross the API boundary; this
 * store never sees a decimal string and never does float arithmetic.
 */
export type CartLine = {
  productId: string;
  name: string;
  /** Integer rupiah — the outlet's effective price, as the catalogue served it. */
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
  /**
   * Rewrites unit prices after the server rejects a checkout with
   * PRICE_CHANGED and the cashier accepts the new ones.
   */
  applyPrices: (priceByProduct: Record<string, Rupiah>) => void;
  /**
   * Refreshes the stock ceilings after inventory refetches, trimming any line
   * that no longer fits. Quantities are otherwise left alone — the cashier's
   * local edits stay authoritative.
   */
  syncAvailability: (stockByProduct: Record<string, number>) => void;
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

  applyPrices: (priceByProduct) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        priceByProduct[line.productId] === undefined
          ? line
          : { ...line, unitPrice: Math.trunc(priceByProduct[line.productId] ?? line.unitPrice) }
      ),
    })),

  syncAvailability: (stockByProduct) =>
    set((state) => ({
      lines: state.lines
        .map((line) => {
          const availableStock = stockByProduct[line.productId] ?? line.availableStock;
          return {
            ...line,
            availableStock,
            quantity: Math.min(line.quantity, availableStock),
          };
        })
        // A product that sold out elsewhere cannot stay in the cart.
        .filter((line) => line.quantity > 0),
    })),
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

/**
 * Total units in the cart, for the badge and the mobile bar ("3 item").
 *
 * This counts units, not lines: two Coca Cola and one Sprite is "3 item".
 */
export function selectItemCount(state: CartState): number {
  return state.lines.reduce((count, line) => count + line.quantity, 0);
}

/** Quantity of one product, or 0. Drives the tile's count circle. */
export function selectQuantityOf(state: CartState, productId: string): number {
  return state.lines.find((line) => line.productId === productId)?.quantity ?? 0;
}
