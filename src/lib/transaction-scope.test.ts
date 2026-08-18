/**
 * The scoping rule, at the unit level.
 *
 * The screen hides a Cashier's outlet filter, but that is cosmetics. What
 * actually confines them is this function, so the crafted-filter case is asserted
 * directly: whatever outlet_id goes in, a Cashier's own outlet comes out.
 */

import { describe, expect, it } from 'vitest';

import type { TransactionSummary } from '@/services/transactions';
import {
  isSearchable,
  isTransactionVisible,
  pageOf,
  scopeTransactionFilters,
  searchTerm,
  summariseTransactions,
} from '@/lib/transaction-scope';

function transaction(overrides: Partial<TransactionSummary> = {}): TransactionSummary {
  return {
    transactionId: 'trx_1',
    transactionNumber: 'TRX-20260813-001',
    outletId: 'otl_a',
    operatorName: 'Budi Santoso',
    total: 150000,
    status: 'COMPLETED',
    createdAt: '2026-08-13T14:30:00.000Z',
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
      { date_from: '2026-08-01', date_to: '2026-08-13', page: 2 },
      'CASHIER',
      'otl_a'
    );

    expect(scoped.filters).toEqual({
      date_from: '2026-08-01',
      date_to: '2026-08-13',
      page: 2,
      outlet_id: 'otl_a',
    });
  });

  it('decides detail visibility by outlet, not by till', () => {
    const own = transaction({ outletId: 'otl_a', operatorName: 'Ani Wijaya' });
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
  /**
   * §5.2's only search endpoint is an exact match on `transaction_number`, so
   * the client no longer filters rows itself — it decides whether there is a
   * term worth looking up and hands it over verbatim.
   */
  it('treats only a non-blank query as a lookup', () => {
    expect(isSearchable('TRX-20260813-001')).toBe(true);
    expect(isSearchable('')).toBe(false);
    expect(isSearchable('   ')).toBe(false);
  });

  it('sends the number exactly as typed, minus the whitespace', () => {
    expect(searchTerm('  TRX-20260813-001  ')).toBe('TRX-20260813-001');
  });

  it('pages the matches client-side', () => {
    const items = [1, 2, 3, 4, 5];

    expect(pageOf(items, 1, 2)).toEqual([1, 2]);
    expect(pageOf(items, 3, 2)).toEqual([5]);
    expect(pageOf(items, 4, 2)).toEqual([]);
  });
});
