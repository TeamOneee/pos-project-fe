/**
 * S-21 and S-22 end to end, plus the two conditions the work is done against:
 *
 *   1. A Cashier cannot retrieve another outlet's transaction by ID. Asserted
 *      through the API a screen would use, from a real Cashier session — not by
 *      checking that a link is missing.
 *   2. A reprinted receipt is the document the sale printed at checkout. Asserted
 *      by rendering both and comparing the output, rather than eyeballing a
 *      screenshot.
 */

import '@/api';

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { resetDb } from '@/api/mock/db';
import { setToken } from '@/api/token';
import { isApiError } from '@/api/errors';
import { authApi, transactionsApi } from '@/services';
import { buildReceipt, receiptFromTransaction } from '@/lib/receipt-data';
import { receiptHtml } from '@/lib/receipt-html';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** trx_004 belongs to Outlet B; budi is a cashier at Outlet A. */
const OTHER_OUTLET_TRANSACTION = 'trx_004';
const OWN_OUTLET_TRANSACTION = 'trx_003';

async function signInAs(email: string) {
  resetDb();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);
}

async function openTransactions(path = '/transactions') {
  render(<App />);
  await act(async () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');
});

describe('S-21 · transaction history', () => {
  it('gives the Owner the outlet and cashier filters', async () => {
    await signInAs('owner@indomart.com');
    await openTransactions();

    expect(await screen.findByRole('combobox', { name: 'Outlet' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Kasir' })).toBeInTheDocument();
  });

  it('summarises the filtered set above the table', async () => {
    await signInAs('owner@indomart.com');
    await openTransactions();

    expect(await screen.findByText('Total Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Total Pendapatan')).toBeInTheDocument();
    expect(screen.getByText('Rata-rata / Transaksi')).toBeInTheDocument();

    // Ten seeded sales, all of them within the summary window.
    expect(await screen.findByText('Menampilkan 1–10 dari 10')).toBeInTheDocument();
  });

  it('scopes a Cashier to their outlet and says which one', async () => {
    await signInAs('budi@indomart.com');
    await openTransactions();

    expect(await screen.findByText('Transaksi di Outlet A - Mall Central.')).toBeInTheDocument();

    // No outlet filter at all, not a disabled one.
    expect(screen.queryByRole('combobox', { name: 'Outlet' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Kasir' })).toBeNull();

    // Every sale at the outlet, including a colleague's: trx_003 is Ani's.
    expect(await screen.findByText('TRX-20260813-003')).toBeInTheDocument();
    // Outlet B's sales are absent.
    expect(screen.queryByText('TRX-20260813-004')).toBeNull();
  });

  it('finds a transaction by number', async () => {
    await signInAs('owner@indomart.com');
    await openTransactions();

    const search = await screen.findByRole('searchbox', { name: 'Cari nomor transaksi' });
    await act(async () => {
      fireEvent.change(search, { target: { value: 'TRX-20260813-002' } });
    });

    await waitFor(() => expect(screen.getByText('Menampilkan 1–1 dari 1')).toBeInTheDocument());
    expect(screen.getByText('TRX-20260813-002')).toBeInTheDocument();
  });

  it('closes the whole screen to an Admin', async () => {
    await signInAs('sari@indomart.com');
    await openTransactions();

    // The route guard answers 403; no table, no filters.
    expect(await screen.findByText(/tidak memiliki akses/i)).toBeInTheDocument();
    expect(screen.queryByText('Total Pendapatan')).toBeNull();
  });
});

describe('S-22 · transaction detail', () => {
  it('opens as a drawer on a deep link, with no way to alter the sale', async () => {
    await signInAs('owner@indomart.com');
    await openTransactions(`/transactions/${OWN_OUTLET_TRANSACTION}`);

    const drawer = await screen.findByRole('dialog');

    // The drawer mounts before its query resolves; wait for the sale itself.
    expect(await within(drawer).findByText('TRX-20260813-003')).toBeInTheDocument();
    expect(within(drawer).getByText('SELESAI')).toBeInTheDocument();
    expect(
      within(drawer).getByText('Harga yang ditampilkan adalah harga saat transaksi terjadi.')
    ).toBeInTheDocument();
    expect(within(drawer).getByText('Subtotal')).toBeInTheDocument();
    expect(within(drawer).getByText('Total')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /cetak struk/i })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /unduh pdf/i })).toBeInTheDocument();

    // Immutable: nothing offers to change it.
    for (const label of [/^edit$/i, /batalkan/i, /void/i, /refund/i, /hapus/i]) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
  });

  it('refuses another outlet’s transaction to a Cashier', async () => {
    await signInAs('budi@indomart.com');
    await openTransactions(`/transactions/${OTHER_OUTLET_TRANSACTION}`);

    const drawer = await screen.findByRole('dialog');
    expect(
      await within(drawer).findByText(
        'Transaksi ini milik outlet lain, jadi tidak bisa ditampilkan di sini.'
      )
    ).toBeInTheDocument();
  });
});

describe('the two conditions this work is done against', () => {
  it('cannot fetch another outlet’s transaction as a Cashier, by any route', async () => {
    await signInAs('budi@indomart.com');

    // The detail endpoint, called directly — the screen is not in the way.
    const refusal = await transactionsApi
      .get(OTHER_OUTLET_TRANSACTION)
      .then(() => null)
      .catch((error: unknown) => error);

    expect(isApiError(refusal)).toBe(true);
    expect(isApiError(refusal) && refusal.kind).toBe('forbidden');

    // And the list cannot be widened: a crafted outlet filter is rewritten.
    const listed = await transactionsApi.list({ outlet_id: 'otl_b', limit: 100 });
    expect(listed.items.length).toBeGreaterThan(0);
    // The mock scopes a Cashier server-side too, so nothing from Outlet B lands.
    expect(listed.items.every((row) => row.outletId === 'otl_a')).toBe(true);
  });

  it('reprints the same receipt the checkout printed', async () => {
    await signInAs('budi@indomart.com');

    // A real sale, so both receipts describe the same transaction.
    const checkout = await transactionsApi.checkout({
      items: [{ product_id: 'prd_cc1500', quantity: 2 }],
      payment_method: 'QRIS',
    });

    const atCheckout = buildReceipt({
      transaction: checkout.transaction,
      items: checkout.items,
      cartLines: [],
      merchantName: 'IndoMart Retail',
      outletName: 'Outlet A - Mall Central',
      cashierName: 'Budi Santoso',
      method: 'NON_CASH',
      received: null,
    });

    const stored = await transactionsApi.get(checkout.transaction.transactionId);
    const onReprint = receiptFromTransaction({
      transaction: stored.transaction,
      items: stored.items,
      merchantName: 'IndoMart Retail',
      outletName: 'Outlet A - Mall Central',
      cashierName: 'Budi Santoso',
    });

    // Same renderer, same data, same document.
    expect(receiptHtml(onReprint)).toBe(receiptHtml(atCheckout));
  });
});
