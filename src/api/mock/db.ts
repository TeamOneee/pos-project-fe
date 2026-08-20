/**
 * Mutable in-memory state for mock mode.
 *
 * Seeded lazily on first use, so importing the mock does not build the dataset
 * in live mode. Everything is stored in **contract 07 wire shape** — the
 * handlers hand these records straight back and let the real schemas parse
 * them, which is what makes the mock a genuine test of the boundary rather than
 * a second opinion about it.
 */

import {
  ANALYSIS_JOB,
  CATEGORIES,
  INSIGHTS,
  INVENTORY,
  MERCHANT,
  NOW,
  OUTLETS,
  PRODUCTS,
  STAFF,
  TRANSACTION_SEEDS,
} from '@/api/mock/dataset';
import { parseMoney } from '@/lib/money';

export type WireStatus = 'ACTIVE' | 'INACTIVE';
export type WireRole = 'OWNER' | 'ADMIN' | 'CASHIER';
export type WirePaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER';
export type WireMovementType = 'ADJUSTMENT' | 'SALE';

export type WireMerchant = {
  id: string;
  owner_user_id: string;
  name: string;
  timezone: string;
  status: WireStatus;
  created_at: string;
  updated_at: string;
};

export type WireStaff = {
  user_id: string;
  merchant_id: string;
  outlet_id: string | null;
  name: string;
  email: string;
  role: WireRole;
  status: WireStatus;
  created_at: string;
  updated_at: string;
};

export type WireOutlet = {
  id: string;
  merchant_id: string;
  name: string;
  address: string;
  status: WireStatus;
  created_at: string;
  updated_at: string;
};

export type WireCategory = {
  id: string;
  merchant_id: string;
  name: string;
  is_active: boolean;
};

export type WireProduct = {
  id: string;
  merchant_id: string;
  category_id: string;
  name: string;
  price: string;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WireProductOutletPrice = {
  product_id: string;
  outlet_id: string;
  price: string;
  updated_at: string;
};

export type WireInventory = {
  id: string;
  merchant_id: string;
  outlet_id: string;
  product_id: string;
  quantity: number;
  low_stock_threshold_override: number | null;
  updated_at: string;
};

export type WireMovement = {
  id: string;
  merchant_id: string;
  outlet_id: string;
  product_id: string;
  type: WireMovementType;
  delta: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  transaction_id: string | null;
  actor_user_id: string;
  created_at: string;
};

export type WireTransactionItem = {
  product_id: string;
  /** Snapshot, per BR-006 — not a live join to the product. */
  name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
};

export type WireTransaction = {
  transaction_id: string;
  merchant_id: string;
  outlet_id: string;
  operator_user_id: string;
  transaction_number: string;
  status: 'COMPLETED';
  subtotal: string;
  total: string;
  payment_method: WirePaymentMethod;
  payment_status: 'CONFIRMED';
  paid_at: string;
  created_at: string;
  items: WireTransactionItem[];
  /** §5.2 idempotency: unique per (merchant, id); the hash detects a conflict. */
  checkout_request_id: string | null;
  request_hash: string | null;
};

export type WireAnalysisJob = {
  id: string;
  state: 'PENDING' | 'PROCESSING' | 'READY' | 'RETRY_SCHEDULED' | 'FAILED';
  analysis_date: string;
  updated_at: string;
};

export type WireInsight = {
  id: string;
  type: 'SALES_TREND' | 'OUTLET_COMPARISON' | 'TOP_PRODUCTS' | 'TIME_PATTERN' | 'AOV_TREND';
  status: 'READY' | 'STALE';
  title: string;
  content: string;
  evidence_summary: Record<string, unknown>;
  period_start: string;
  period_end: string;
  generated_at: string;
};

export type Db = {
  merchant: WireMerchant;
  staff: WireStaff[];
  outlets: WireOutlet[];
  categories: WireCategory[];
  products: WireProduct[];
  productOutletPrices: WireProductOutletPrice[];
  inventory: WireInventory[];
  movements: WireMovement[];
  transactions: WireTransaction[];
  analysisJob: WireAnalysisJob | null;
  insights: WireInsight[];
  sequence: number;
};

let db: Db | null = null;

export function getDb(): Db {
  if (!db) db = seed();
  return db;
}

/** Drops every mutation and rebuilds from the seed. Used between tests. */
export function resetDb(): void {
  db = seed();
}

/**
 * Empties the insight state so `GET /insights` answers 404, which §7.2 makes
 * the "never analysed" case rather than an error.
 */
export function clearInsights(): void {
  const state = getDb();
  state.analysisJob = null;
  state.insights = [];
}

function seed(): Db {
  const products: WireProduct[] = PRODUCTS.map((product) => ({ ...product }));

  const transactions: WireTransaction[] = TRANSACTION_SEEDS.map((seedRow) => {
    const items = seedRow.lines.flatMap<WireTransactionItem>(([productId, quantity]) => {
      const product = products.find((candidate) => candidate.id === productId);
      if (!product) return [];

      const unit = parseMoney(product.price);
      return [
        {
          product_id: product.id,
          name: product.name,
          unit_price: toWireMoney(unit),
          quantity,
          subtotal: toWireMoney(unit * quantity),
        },
      ];
    });

    const subtotal = items.reduce((sum, item) => sum + parseMoney(item.subtotal), 0);

    return {
      transaction_id: seedRow.transaction_id,
      merchant_id: MERCHANT.id,
      outlet_id: seedRow.outlet_id,
      operator_user_id: seedRow.operator_user_id,
      transaction_number: seedRow.transaction_number,
      status: 'COMPLETED' as const,
      subtotal: toWireMoney(subtotal),
      // §5.1 (OD-004): total is subtotal, always.
      total: toWireMoney(subtotal),
      payment_method: seedRow.payment_method,
      payment_status: 'CONFIRMED' as const,
      paid_at: seedRow.created_at,
      created_at: seedRow.created_at,
      items,
      checkout_request_id: null,
      request_hash: null,
    };
  });

  return {
    merchant: { ...MERCHANT },
    staff: STAFF.map((member) => ({ ...member })),
    outlets: OUTLETS.map((outlet) => ({ ...outlet })),
    categories: CATEGORIES.map((category) => ({ ...category })),
    products,
    productOutletPrices: [],
    inventory: INVENTORY.map((row) => ({ ...row })),
    movements: [],
    transactions,
    analysisJob: { ...ANALYSIS_JOB },
    insights: INSIGHTS.map((insight) => ({ ...insight })),
    sequence: transactions.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Lookups                                                                     */
/* -------------------------------------------------------------------------- */

export function findOutlet(outletId: string): WireOutlet | undefined {
  return getDb().outlets.find((outlet) => outlet.id === outletId);
}

export function findProduct(productId: string): WireProduct | undefined {
  return getDb().products.find((product) => product.id === productId);
}

export function findProductOutletPrice(
  productId: string,
  outletId: string
): WireProductOutletPrice | undefined {
  return getDb().productOutletPrices.find(
    (entry) => entry.product_id === productId && entry.outlet_id === outletId
  );
}

export function findCategory(categoryId: string): WireCategory | undefined {
  return getDb().categories.find((category) => category.id === categoryId);
}

export function findStaff(userId: string): WireStaff | undefined {
  return getDb().staff.find((member) => member.user_id === userId);
}

export function findInventory(outletId: string, productId: string): WireInventory | undefined {
  return getDb().inventory.find(
    (row) => row.outlet_id === outletId && row.product_id === productId
  );
}

/**
 * The inventory row for a pairing, created at zero when it does not exist.
 *
 * §4.2 does this for the threshold endpoint explicitly, and an adjustment
 * against a product an outlet has never stocked has to land somewhere too.
 */
export function ensureInventory(outletId: string, productId: string): WireInventory {
  const existing = findInventory(outletId, productId);
  if (existing) return existing;

  const row: WireInventory = {
    id: `inv_${outletId}_${productId}`,
    merchant_id: getDb().merchant.id,
    outlet_id: outletId,
    product_id: productId,
    quantity: 0,
    low_stock_threshold_override: null,
    updated_at: NOW,
  };

  getDb().inventory.push(row);
  return row;
}

/* -------------------------------------------------------------------------- */
/* Derived values                                                              */
/* -------------------------------------------------------------------------- */

/**
 * §4.1 rule 5: the threshold a row is actually judged against — the outlet's
 * override where it set one, the product's base value otherwise.
 */
export function effectiveThreshold(row: WireInventory): number {
  if (row.low_stock_threshold_override !== null) return row.low_stock_threshold_override;
  return findProduct(row.product_id)?.low_stock_threshold ?? 0;
}

export function isLowStock(row: WireInventory): boolean {
  return row.quantity <= effectiveThreshold(row);
}

/** §3.2 (OD-002): outlet override when present, master price otherwise. */
export function priceOf(product: WireProduct, outletId?: string): number {
  const override = outletId ? findProductOutletPrice(product.id, outletId) : undefined;
  return parseMoney(override?.price ?? product.price);
}

/** Integer rupiah back to the contract's decimal string (§0). */
export function toWireMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${Math.abs(Math.trunc(amount))}.00`;
}

/** A fresh id, stable within a session so responses are reproducible. */
export function nextId(prefix: string): string {
  const state = getDb();
  state.sequence += 1;
  return `${prefix}_${String(state.sequence).padStart(4, '0')}`;
}

export function nextTransactionNumber(when: Date): string {
  const state = getDb();
  const day = `${when.getFullYear()}${pad(when.getMonth() + 1)}${pad(when.getDate())}`;
  return `TRX-${day}-${String(state.sequence).padStart(3, '0')}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * §5.2 step 3: a hash over the canonical request, used to tell a genuine replay
 * from a reused `checkout_request_id` carrying different items.
 *
 * FNV-1a over sorted, normalised JSON. Not cryptographic — the real server uses
 * sha256 — but it separates "same request" from "different request", which is
 * the only thing the mock needs it to do.
 */
export function requestHash(value: unknown): string {
  const canonical = canonicalJson(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`);

  return `{${entries.join(',')}}`;
}

/** Records a stock movement and moves the quantity in one step. */
export function applyMovement(input: {
  outletId: string;
  productId: string;
  delta: number;
  type: WireMovementType;
  reason: string | null;
  actorUserId: string;
  transactionId?: string | null;
  at: string;
}): WireMovement {
  const row = ensureInventory(input.outletId, input.productId);
  const before = row.quantity;

  row.quantity = before + input.delta;
  row.updated_at = input.at;

  const movement: WireMovement = {
    id: nextId('mov'),
    merchant_id: getDb().merchant.id,
    outlet_id: input.outletId,
    product_id: input.productId,
    type: input.type,
    delta: input.delta,
    quantity_before: before,
    quantity_after: row.quantity,
    reason: input.reason,
    transaction_id: input.transactionId ?? null,
    actor_user_id: input.actorUserId,
    created_at: input.at,
  };

  getDb().movements.unshift(movement);
  return movement;
}
