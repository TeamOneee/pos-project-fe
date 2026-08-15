/**
 * Keeps the Zustand cart and the server cart in step.
 *
 * The rule is local-first: every tap changes Zustand immediately and the screen
 * re-renders from it, because a cashier cannot wait for a round trip between
 * taps. The server is brought up to date afterwards, on a debounce, so holding
 * "+" six times sends one request carrying the final quantity rather than six
 * requests racing each other.
 *
 * Writes are sequential. Every cart endpoint returns the whole cart, so two
 * in-flight mutations would each overwrite the other's view of it.
 *
 * The server stays authoritative about failure: if a write is rejected — the
 * usual case being stock that went while the cart was open — the local cart is
 * reset to whatever the server actually holds rather than left optimistic.
 */

import * as React from 'react';

import { useToast } from '@/components/ui/toast';
import {
  useAddCartItem,
  useCart,
  useClearCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '@/hooks/use-cart';
import type { Cart } from '@/lib/api/domains/cart';
import { insufficientStockDetails, isApiError } from '@/lib/api/errors';
import { useCartStore, type CartLine } from '@/stores/cart';

/** Long enough to collapse a burst of taps, short enough to feel immediate. */
const DEBOUNCE_MS = 400;

type Options = {
  enabled: boolean;
  /** Stock ceilings from the catalogue, used when seeding from the server. */
  stockByProduct: Record<string, number>;
};

export function useCartSync({ enabled, stockByProduct }: Options) {
  const { toast } = useToast();

  const serverCart = useCart({ enabled });
  const addItem = useAddCartItem();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();

  const lines = useCartStore((state) => state.lines);
  const hydrate = useCartStore((state) => state.hydrate);

  /** Quantities the server is known to hold, so the flush can diff against it. */
  const synced = React.useRef<Map<string, number>>(new Map());
  const hydrated = React.useRef(false);
  const flushing = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest values, read inside the debounced flush without re-arming it.
  // Written in an effect rather than during render: the flush only ever reads
  // this later, from a timer.
  const latest = React.useRef({ lines, cart: serverCart.data ?? null, stockByProduct });
  React.useEffect(() => {
    latest.current = { lines, cart: serverCart.data ?? null, stockByProduct };
  }, [lines, serverCart.data, stockByProduct]);

  /** Seed the local cart from the server's, once, so a reload keeps the sale. */
  React.useEffect(() => {
    if (!enabled || hydrated.current) return;
    // A 404 means no open cart, which is a perfectly good starting point.
    if (serverCart.isPending) return;

    hydrated.current = true;
    const cart = serverCart.data;
    if (!cart) return;

    hydrate(cart.items.map((item) => toLine(item, stockByProduct)));
    synced.current = new Map(cart.items.map((item) => [item.productId, item.quantity]));
  }, [enabled, serverCart.isPending, serverCart.data, hydrate, stockByProduct]);

  const resetToServer = React.useCallback(
    (cart: Cart | null) => {
      const items = cart?.items ?? [];
      hydrate(items.map((item) => toLine(item, latest.current.stockByProduct)));
      synced.current = new Map(items.map((item) => [item.productId, item.quantity]));
    },
    [hydrate]
  );

  const flush = React.useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;

    try {
      // Recomputed each pass: an earlier write may have changed the cart.
      for (;;) {
        const operation = nextOperation(latest.current.lines, synced.current, latest.current.cart);
        if (!operation) break;

        try {
          const cart = await runOperation(operation, {
            addItem: addItem.mutateAsync,
            updateItem: updateItem.mutateAsync,
            removeItem: removeItem.mutateAsync,
          });
          synced.current = new Map(cart.items.map((item) => [item.productId, item.quantity]));
        } catch (error) {
          reportSyncFailure(error, toast);
          // The server refused; its cart is the truth now.
          resetToServer(await refetchCart(serverCart.refetch));
          break;
        }
      }
    } finally {
      flushing.current = false;
    }
  }, [addItem, updateItem, removeItem, resetToServer, serverCart.refetch, toast]);

  /** Any local change re-arms the debounce. */
  React.useEffect(() => {
    if (!enabled || !hydrated.current) return;
    if (!hasPendingWork(lines, synced.current)) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, lines, flush]);

  /** Clearing is immediate on both sides — it is never part of a burst. */
  const clear = React.useCallback(() => {
    useCartStore.getState().clear();
    synced.current = new Map();

    clearCart.mutate(undefined, {
      onError: (error) => {
        reportSyncFailure(error, toast);
        void refetchCart(serverCart.refetch).then(resetToServer);
      },
    });
  }, [clearCart, resetToServer, serverCart.refetch, toast]);

  return {
    clear,
    /** True while a write is in flight; the pay button waits for it to settle. */
    isSyncing:
      addItem.isPending || updateItem.isPending || removeItem.isPending || clearCart.isPending,
    cartId: serverCart.data?.cartId ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Diffing                                                                     */
/* -------------------------------------------------------------------------- */

type Operation =
  | { kind: 'add'; productId: string; quantity: number }
  | { kind: 'update'; cartItemId: string; quantity: number }
  | { kind: 'remove'; cartItemId: string };

function hasPendingWork(lines: CartLine[], synced: Map<string, number>): boolean {
  if (lines.length !== synced.size) return true;
  return lines.some((line) => synced.get(line.productId) !== line.quantity);
}

/**
 * One difference at a time, so each write is a whole-cart response the next
 * pass can diff against.
 */
function nextOperation(
  lines: CartLine[],
  synced: Map<string, number>,
  cart: Cart | null
): Operation | null {
  const cartItemIdOf = (productId: string) =>
    cart?.items.find((item) => item.productId === productId)?.cartItemId ?? null;

  for (const line of lines) {
    if (synced.get(line.productId) === line.quantity) continue;

    const cartItemId = cartItemIdOf(line.productId);
    // Absolute quantities throughout: POST adds, PUT sets, so a line the server
    // has never seen is the only case that may be added.
    if (cartItemId) return { kind: 'update', cartItemId, quantity: line.quantity };
    return { kind: 'add', productId: line.productId, quantity: line.quantity };
  }

  for (const productId of synced.keys()) {
    if (lines.some((line) => line.productId === productId)) continue;

    const cartItemId = cartItemIdOf(productId);
    if (cartItemId) return { kind: 'remove', cartItemId };

    // Gone from both sides already; drop it so the loop can terminate.
    synced.delete(productId);
  }

  return null;
}

type Mutations = {
  addItem: (input: { product_id: string; quantity: number }) => Promise<Cart>;
  updateItem: (input: { cartItemId: string; quantity: number }) => Promise<Cart>;
  removeItem: (cartItemId: string) => Promise<Cart>;
};

function runOperation(operation: Operation, mutations: Mutations): Promise<Cart> {
  switch (operation.kind) {
    case 'add':
      return mutations.addItem({
        product_id: operation.productId,
        quantity: operation.quantity,
      });
    case 'update':
      return mutations.updateItem({
        cartItemId: operation.cartItemId,
        quantity: operation.quantity,
      });
    case 'remove':
      return mutations.removeItem(operation.cartItemId);
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function toLine(
  item: Cart['items'][number],
  stockByProduct: Record<string, number>
): CartLine {
  return {
    productId: item.productId,
    name: item.product?.name ?? '',
    sku: item.product?.sku ?? '',
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    // Falls back to the quantity already in the cart, so a missing stock
    // reading can never silently trim a line the server accepted.
    availableStock: stockByProduct[item.productId] ?? item.quantity,
  };
}

async function refetchCart(refetch: () => Promise<{ data?: Cart | undefined }>) {
  try {
    const result = await refetch();
    return result.data ?? null;
  } catch {
    return null;
  }
}

function reportSyncFailure(error: unknown, toast: ReturnType<typeof useToast>['toast']): void {
  const shortfalls = insufficientStockDetails(error);

  if (shortfalls.length > 0) {
    const first = shortfalls[0];
    toast({
      title: 'Stok tidak mencukupi',
      description: `${first?.productName ?? 'Produk'} tersisa ${first?.available ?? 0}.`,
      variant: 'warning',
    });
    return;
  }

  toast({
    title: 'Keranjang gagal disimpan',
    description: isApiError(error) ? error.message : 'Coba ulangi tindakan terakhir.',
    variant: 'error',
  });
}
