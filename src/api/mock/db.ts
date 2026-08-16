/**
 * Mutable in-memory state for mock mode.
 *
 * Seeded lazily on first use, so importing the mock does not build the dataset
 * in live mode. Everything is stored in wire shape — the handlers hand these
 * records straight back and let the real schemas parse them.
 */

import {
  CATEGORIES,
  INVENTORY,
  MERCHANT,
  NOW,
  OUTLETS,
  PRODUCTS,
  TRANSACTION_SEEDS,
  USERS,
} from '@/api/mock/dataset';
import { parseMoney } from '@/lib/money';

/**
 * Wire records, declared rather than inferred from the dataset: the seed uses
 * literal types like `'ACTIVE'`, and these have to stay mutable to `'INACTIVE'`.
 */
export type WireStatus = 'ACTIVE' | 'INACTIVE';

export type WireMerchant = {
  merchant_id: string;
  name: string;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
};

export type WireUser = {
  user_id: string;
  merchant_id: string;
  outlet_id: string | null;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'CASHIER';
  status: WireStatus;
  created_at: string;
  updated_at: string;
};

export type WireOutlet = {
  outlet_id: string;
  merchant_id: string;
  name: string;
  address: string;
  status: WireStatus;
  created_at: string;
  updated_at: string;
};

export type WireCategory = {
  category_id: string;
  merchant_id: string;
  name: string;
  status: WireStatus;
  created_at: string;
  updated_at: string;
};

export type WireProduct = {
  product_id: string;
  merchant_id: string;
  category_id: string;
  name: string;
  sku: string;
  price: string;
  status: WireStatus;
  created_at: string;
  updated_at: string;
};

export type WireInventory = {
  inventory_id: string;
  outlet_id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
};

export type WireTransactionItem = {
  transaction_item_id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
};

export type WireTransaction = {
  transaction_id: string;
  outlet_id: string;
  user_id: string;
  transaction_number: string;
  subtotal: string;
  total: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  created_at: string;
  payment: {
    method: 'CASH' | 'QRIS' | 'DEBIT' | 'TRANSFER';
    amount: string;
    paid_at: string;
  } | null;
};

export type WireCartItem = {
  cart_item_id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
};

export type WireCart = {
  cart_id: string;
  outlet_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items: WireCartItem[];
};

export type MockDb = {
  merchant: WireMerchant;
  outlets: WireOutlet[];
  users: WireUser[];
  categories: WireCategory[];
  products: WireProduct[];
  inventory: WireInventory[];
  transactions: WireTransaction[];
  transactionItems: WireTransactionItem[];
  carts: WireCart[];
  /** Idempotency key → transaction id, so a replayed checkout returns the original. */
  idempotency: Map<string, string>;
  /** The signed-in user; null until /auth/login succeeds. */
  session: WireUser | null;
  aiJob: { jobId: string; startedAt: number } | null;
  sequence: number;
};

let db: MockDb | null = null;

/** Money on the wire: integer rupiah rendered the way the backend renders it. */
export function toWireMoney(amount: number): string {
  return `${Math.trunc(amount)}.00`;
}

export function priceOf(product: WireProduct): number {
  return parseMoney(product.price);
}

function seed(): MockDb {
  const transactions: WireTransaction[] = [];
  const transactionItems: WireTransactionItem[] = [];

  TRANSACTION_SEEDS.forEach((seedTransaction, transactionIndex) => {
    let subtotal = 0;

    seedTransaction.lines.forEach(([productId, quantity], lineIndex) => {
      const product = PRODUCTS.find((entry) => entry.product_id === productId);
      if (!product) return;

      const unitPrice = parseMoney(product.price);
      const lineSubtotal = unitPrice * quantity;
      subtotal += lineSubtotal;

      transactionItems.push({
        transaction_item_id: `txi_${transactionIndex + 1}_${lineIndex + 1}`,
        transaction_id: seedTransaction.transaction_id,
        product_id: productId,
        quantity,
        unit_price: toWireMoney(unitPrice),
        subtotal: toWireMoney(lineSubtotal),
      });
    });

    transactions.push({
      transaction_id: seedTransaction.transaction_id,
      outlet_id: seedTransaction.outlet_id,
      user_id: seedTransaction.user_id,
      transaction_number: seedTransaction.transaction_number,
      // Total equals subtotal — there is no discount, tax or service charge.
      subtotal: toWireMoney(subtotal),
      total: toWireMoney(subtotal),
      status: seedTransaction.status ?? 'COMPLETED',
      created_at: seedTransaction.created_at,
      payment: {
        method: seedTransaction.payment_method,
        amount: toWireMoney(subtotal),
        paid_at: seedTransaction.created_at,
      },
    });
  });

  return {
    merchant: { ...MERCHANT },
    outlets: OUTLETS.map((outlet) => ({ ...outlet })),
    users: USERS.map((user) => ({ ...user })),
    categories: CATEGORIES.map((category) => ({ ...category })),
    products: PRODUCTS.map((product) => ({ ...product })),
    inventory: INVENTORY.map((row) => ({ ...row })),
    transactions,
    transactionItems,
    carts: [],
    idempotency: new Map(),
    session: null,
    aiJob: null,
    sequence: TRANSACTION_SEEDS.length,
  };
}

export function getDb(): MockDb {
  if (!db) db = seed();
  return db;
}

/** Drop every mutation and reseed. Tests call this between cases. */
export function resetDb(): void {
  db = seed();
}

export function nextId(prefix: string): string {
  const database = getDb();
  database.sequence += 1;
  return `${prefix}_${database.sequence}`;
}

/* -------------------------------------------------------------------------- */
/* Lookups                                                                     */
/* -------------------------------------------------------------------------- */

export function findProduct(productId: string): WireProduct | undefined {
  return getDb().products.find((product) => product.product_id === productId);
}

export function findOutlet(outletId: string): WireOutlet | undefined {
  return getDb().outlets.find((outlet) => outlet.outlet_id === outletId);
}

export function findInventory(outletId: string, productId: string): WireInventory | undefined {
  return getDb().inventory.find(
    (row) => row.outlet_id === outletId && row.product_id === productId
  );
}

export function stockAt(outletId: string, productId: string): number {
  return findInventory(outletId, productId)?.quantity ?? 0;
}

/** Ensures a row exists so a transfer can land at an outlet that never held it. */
export function ensureInventory(outletId: string, productId: string): WireInventory {
  const existing = findInventory(outletId, productId);
  if (existing) return existing;

  const created: WireInventory = {
    inventory_id: `inv_${outletId}_${productId}`,
    outlet_id: outletId,
    product_id: productId,
    quantity: 0,
    updated_at: NOW,
  };
  getDb().inventory.push(created);
  return created;
}

/* -------------------------------------------------------------------------- */
/* Cart                                                                        */
/* -------------------------------------------------------------------------- */

export function findCart(userId: string): WireCart | undefined {
  return getDb().carts.find((cart) => cart.user_id === userId);
}

export function ensureCart(user: WireUser): WireCart {
  const existing = findCart(user.user_id);
  if (existing) return existing;

  const created: WireCart = {
    cart_id: nextId('cart'),
    outlet_id: user.outlet_id ?? '',
    user_id: user.user_id,
    created_at: NOW,
    updated_at: NOW,
    items: [],
  };
  getDb().carts.push(created);
  return created;
}

/* -------------------------------------------------------------------------- */
/* Derived views                                                               */
/* -------------------------------------------------------------------------- */

export type StockAlertRow = {
  inventory: WireInventory;
  product: WireProduct;
  outlet: WireOutlet;
};

/** Every inventory row joined to its product and outlet, active products only. */
export function stockRows(): StockAlertRow[] {
  const database = getDb();

  return database.inventory.flatMap((inventory) => {
    const product = database.products.find((entry) => entry.product_id === inventory.product_id);
    const outlet = database.outlets.find((entry) => entry.outlet_id === inventory.outlet_id);
    if (!product || !outlet || product.status !== 'ACTIVE') return [];
    return [{ inventory, product, outlet }];
  });
}

export function lowStockRows(outletId?: string): StockAlertRow[] {
  const threshold = getDb().merchant.low_stock_threshold;
  return stockRows().filter(
    (row) =>
      (!outletId || row.outlet.outlet_id === outletId) &&
      row.inventory.quantity > 0 &&
      row.inventory.quantity <= threshold
  );
}

export function outOfStockRows(outletId?: string): StockAlertRow[] {
  return stockRows().filter(
    (row) => (!outletId || row.outlet.outlet_id === outletId) && row.inventory.quantity === 0
  );
}
