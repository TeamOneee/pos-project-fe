/** What a session is allowed to ask /transactions for, and what the answer adds up to. */

import type { TransactionFilters, TransactionSummary } from '@/services/transactions';
import { dataScope, type Role } from '@/lib/permissions';
import { sumRupiah, type Rupiah } from '@/lib/money';

export type ScopedQuery = {
  filters: TransactionFilters;
  /** False when the session is confined to an outlet we do not know yet. */
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
  transaction: Pick<TransactionSummary, 'outletId'>,
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

export type TransactionTotals = {
  /** Exact: it comes from the server's `total`, not from the rows on screen. */
  count: number;
  revenue: Rupiah;
  /** Integer rupiah — truncated, never rounded up into money nobody took. */
  average: Rupiah;
  /** True when `rows` did not cover every match, so revenue is a subset. */
  capped: boolean;
};

/** The three tiles above the table. */
export function summariseTransactions(
  rows: TransactionSummary[],
  total: number,
  windowSize: number
): TransactionTotals {
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

/** Whether a typed query is a transaction-number lookup at all. */
export function isSearchable(query: string): boolean {
  return query.trim().length > 0;
}

/** The exact number to look up, normalised. */
export function searchTerm(query: string): string {
  return query.trim();
}

/** Client-side page of an already-filtered list. */
export function pageOf<T>(items: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}
