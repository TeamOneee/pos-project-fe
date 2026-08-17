/**
 * What a session is allowed to ask /transactions for, and what the answer adds
 * up to.
 *
 * The scoping is the security-relevant part. A Cashier may only see their own
 * outlet, and the way to guarantee that is not to hide the outlet filter — a
 * hidden control is still a query someone can craft. Instead the filter is
 * rewritten here, on the way into the query, so the outlet a Cashier asks for is
 * always the outlet they are assigned to regardless of what the caller passed.
 * The backend enforces the same rule; this is the client agreeing with it.
 *
 * "Own outlet" means the outlet, not the till: a cashier sees every transaction
 * rung up at their outlet, including their colleagues'. That is what makes the
 * screen useful for an end-of-shift check.
 */

import type { Transaction, TransactionFilters } from '@/services/transactions';
import { dataScope, type Role } from '@/lib/permissions';
import { sumRupiah, type Rupiah } from '@/lib/money';

export type ScopedQuery = {
  filters: TransactionFilters;
  /**
   * False when the session is confined to an outlet we do not know yet. The
   * query must not run: an unscoped request would return every outlet.
   */
  enabled: boolean;
};

export function scopeTransactionFilters(
  filters: TransactionFilters,
  role: Role | null,
  sessionOutletId: string | null
): ScopedQuery {
  if (role === null) return { filters, enabled: false };
  if (dataScope(role) === 'all-outlets') return { filters, enabled: true };

  if (!sessionOutletId) {
    // Drop any outlet the caller asked for rather than sending it unscoped.
    const withoutOutlet = { ...filters };
    delete withoutOutlet.outlet_id;
    return { filters: withoutOutlet, enabled: false };
  }

  // The override, not a default: a crafted `outlet_id` is replaced, not merged.
  return { filters: { ...filters, outlet_id: sessionOutletId }, enabled: true };
}

/** True when a session may open this transaction's detail. */
export function isTransactionVisible(
  transaction: Pick<Transaction, 'outletId'>,
  role: Role | null,
  sessionOutletId: string | null
): boolean {
  if (role === null) return false;
  if (dataScope(role) === 'all-outlets') return true;
  return Boolean(sessionOutletId) && transaction.outletId === sessionOutletId;
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                     */
/* -------------------------------------------------------------------------- */

export type TransactionSummary = {
  /** Exact: it comes from the server's `total`, not from the rows on screen. */
  count: number;
  revenue: Rupiah;
  /** Integer rupiah — truncated, never rounded up into money nobody took. */
  average: Rupiah;
  /** True when `rows` did not cover every match, so revenue is a subset. */
  capped: boolean;
};

/**
 * The three tiles above the table.
 *
 * There is no aggregate endpoint for a filtered set of transactions, so revenue
 * is summed client-side over as many matching rows as one request returns. The
 * count still comes from the server's `total`, which is exact — and `capped`
 * tells the strip to say so when the sum is over a subset rather than quietly
 * reporting a number that is too small.
 */
export function summariseTransactions(
  rows: Transaction[],
  total: number,
  windowSize: number
): TransactionSummary {
  const revenue = sumRupiah(rows.map((row) => row.total));

  return {
    count: total,
    revenue,
    average: rows.length > 0 ? Math.trunc(revenue / rows.length) : 0,
    capped: total > windowSize,
  };
}

/* -------------------------------------------------------------------------- */
/* Number search                                                               */
/* -------------------------------------------------------------------------- */

/**
 * `GET /transactions` has no search parameter — the contract filters by outlet,
 * cashier and date only. So looking up a transaction number is done over the
 * rows already fetched for the summary, and the footer says how many matched.
 * A backend `search=` would make this a server concern; until then this is the
 * honest version rather than a search box that only sees the current page.
 */
export function matchesTransactionNumber(transaction: Transaction, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return transaction.transactionNumber.toLowerCase().includes(needle);
}

/** Client-side page of an already-filtered list. */
export function pageOf<T>(items: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}
