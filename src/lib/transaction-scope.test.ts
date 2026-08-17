/**
 * The scoping rule, at the unit level.
 *
 * The screen hides a Cashier's outlet filter, but that is cosmetics. What
 * actually confines them is this function, so the crafted-filter case is asserted
 * directly: whatever outlet_id goes in, a Cashier's own outlet comes out.
 */

import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/services/transactions';
import {
  isTransactionVisible,
  matchesTransactionNumber,
  pageOf,
  scopeTransactionFilters,
  summariseTransactions,
} from '@/lib/transaction-scope';

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    transactionId: 'trx_1',
    outletId: 'otl_a',
    userId: 'usr_1',
    transactionNumber: 'TRX-20260813-001',
    subtotal: 150000,
    total: 150000,
    status: 'COMPLETED',
    createdAt: '2026-08-13T14:30:00.000Z',
    itemCount: 3,
    payment: null,
    outlet: null,
    cashier: null,
    ...overrides,
  };
}

describe('transaction scoping', () => {
  it('leaves an Owner free to ask for any outlet', () => {
    const scoped = scopeTransactionFilters({ outlet_id: 'otl_b' }, 'OWNER', null);

    expect(scoped.filters.outlet_id).toBe('otl_b');
    expect(scoped.enabled).toBe(true);
  });

  it('overwrites a crafted outlet filter for a Cashier', () => {
    const scoped = scopeTransactionFilters({ outlet_id: 'otl_b' }, 'CASHIER', 'otl_a');

    expect(scoped.filters.outlet_id).toBe('otl_a');
    expect(scoped.enabled).toBe(true);
  });

  it('refuses to run unscoped when the Cashier has no outlet yet', () => {
    const scoped = scopeTransactionFilters({ outlet_id: 'otl_b' }, 'CASHIER', null);

    // Neither the crafted outlet nor a request at all.
    expect(scoped.filters.outlet_id).toBeUndefined();
    expect(scoped.enabled).toBe(false);
  });

  it('keeps the other filters intact', () => {
    const scoped = scopeTransactionFilters(
      { start_date: '2026-08-01', end_date: '2026-08-13', cashier_id: 'usr_9', page: 2 },
      'CASHIER',
      'otl_a'
    );

    expect(scoped.filters).toEqual({
      start_date: '2026-08-01',
      end_date: '2026-08-13',
      cashier_id: 'usr_9',
      page: 2,
      outlet_id: 'otl_a',
    });
  });

  it('decides detail visibility by outlet, not by till', () => {
    const own = transaction({ outletId: 'otl_a', userId: 'someone_else' });
    const other = transaction({ outletId: 'otl_b' });

    // A colleague's sale at the same outlet is visible; another outlet is not.
    expect(isTransactionVisible(own, 'CASHIER', 'otl_a')).toBe(true);
    expect(isTransactionVisible(other, 'CASHIER', 'otl_a')).toBe(false);
    expect(isTransactionVisible(other, 'OWNER', null)).toBe(true);
  });
});

describe('summary strip', () => {
  it('sums integer rupiah and truncates the average', () => {
    const rows = [transaction({ total: 150000 }), transaction({ total: 45000 })];
    const summary = summariseTransactions(rows, 2, 500);

    expect(summary.count).toBe(2);
    expect(summary.revenue).toBe(195000);
    expect(summary.average).toBe(97500);
    expect(summary.capped).toBe(false);
  });

  it('reports the count from the server and flags a partial sum', () => {
    const summary = summariseTransactions([transaction({ total: 1000 })], 900, 500);

    // The count is exact even though revenue covers only the fetched window.
    expect(summary.count).toBe(900);
    expect(summary.capped).toBe(true);
  });
});

describe('number search', () => {
  it('matches case-insensitively on a partial number', () => {
    const row = transaction({ transactionNumber: 'TRX-20260813-001' });

    expect(matchesTransactionNumber(row, '813-001')).toBe(true);
    expect(matchesTransactionNumber(row, 'trx-2026')).toBe(true);
    expect(matchesTransactionNumber(row, 'TRX-99999999-001')).toBe(false);
    // An empty query is not a filter.
    expect(matchesTransactionNumber(row, '   ')).toBe(true);
  });

  it('pages the matches client-side', () => {
    const items = [1, 2, 3, 4, 5];

    expect(pageOf(items, 1, 2)).toEqual([1, 2]);
    expect(pageOf(items, 3, 2)).toEqual([5]);
    expect(pageOf(items, 4, 2)).toEqual([]);
  });
});
