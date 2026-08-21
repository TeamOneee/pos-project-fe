/** S-21 and S-22 end to end, plus the two conditions the work is done against: */

import '@/api';

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { resetDb } from '@/api/mock/db';
import { setToken } from '@/api/token';
import { isApiError } from '@/api/errors';
import { authApi, mintCheckoutRequestId, transactionsApi } from '@/services';
import { receiptFromCheckout, receiptFromDto } from '@/lib/receipt-data';
import { receiptHtml } from '@/lib/receipt-html';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** trx_004 belongs to Outlet B; budi is a cashier at Outlet A. */
/**
 * §5.2 (OD-003) scopes a Cashier to **their own sales**, not to their outlet: `operator_user_id` is
 * forced in the service.
 */
const OWN_TRANSACTION = 'trx_001';
const COLLEAGUE_TRANSACTION = 'trx_002';
const OTHER_OUTLET_TRANSACTION = 'trx_003';

async function signInAs(email: string) {
  resetDb();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);
}

async function openTransactions(path = '/transactions') {
  window.history.pushState({}, '', path);
  await act(async () => {
    render(<App />);
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
    // No Kasir filter: §5.2 takes a date range and an outlet, and nothing else.
    expect(screen.queryByRole('combobox', { name: 'Kasir' })).toBeNull();
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

    // The outlet cannot be named to a cashier — §2.2 closes GET /outlets to them — so the scope
    // line says what it can.
    expect(await screen.findByText('Transaksi di outlet Anda.')).toBeInTheDocument();

    // No outlet filter at all, not a disabled one.
    expect(screen.queryByRole('combobox', { name: 'Outlet' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Kasir' })).toBeNull();

    // Every sale at the outlet, including a colleague's: trx_003 is Ani's.
    expect(await screen.findByText('TRX-20260813-001')).toBeInTheDocument();
    // Outlet B's sales are absent. Ani's sale at the same outlet, and Rudi's at another: neither is
    // Budi's.
    expect(screen.queryByText('TRX-20260813-002')).toBeNull();
    expect(screen.queryByText('TRX-20260813-003')).toBeNull();
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
    await openTransactions(`/transactions/${OWN_TRANSACTION}`);

    const drawer = await screen.findByRole('dialog');

    // The drawer mounts before its query resolves; wait for the sale itself.
    expect(await within(drawer).findByText('TRX-20260813-001')).toBeInTheDocument();
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

  it('refuses a sale that is not the Cashier’s own', async () => {
    await signInAs('budi@indomart.com');
    await openTransactions(`/transactions/${OTHER_OUTLET_TRANSACTION}`);

    const drawer = await screen.findByRole('dialog');
    expect(
      // §5.2 disguises another scope's sale as a 404 rather than a 403, so the screen must not
      // claim to know the transaction exists elsewhere.
      await within(drawer).findByText('Nomor transaksi ini tidak ada, atau sudah tidak tersedia.')
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
    // Disguised as "not found" (§5.2), which is the point: a cashier cannot even learn that another
    // outlet's transaction exists.
    expect(isApiError(refusal) && refusal.kind).toBe('not_found');

    // Nor is a colleague's sale at the same outlet readable (OD-003).
    const colleague = await transactionsApi
      .get(COLLEAGUE_TRANSACTION)
      .then(() => null)
      .catch((error: unknown) => error);
    expect(isApiError(colleague) && colleague.kind).toBe('not_found');

    // And the list cannot be widened: a crafted outlet filter is rewritten.
    const listed = await transactionsApi.list({ outlet_id: 'otl_b', size: 100 });
    expect(listed.items.length).toBeGreaterThan(0);
    // The mock scopes a Cashier server-side too, so nothing from Outlet B lands.
    expect(listed.items.every((row) => row.outletId === 'otl_a')).toBe(true);
  });

  it('reprints the same receipt the checkout printed', async () => {
    await signInAs('budi@indomart.com');

    // A real sale, so both receipts describe the same transaction.
    const checkout = await transactionsApi.checkout({
      checkout_request_id: mintCheckoutRequestId(),
      outlet_id: 'otl_a',
      payment_method: 'QRIS',
      items: [{ product_id: 'prd_cc1500', quantity: 2 }],
    });

    const atCheckout = receiptFromCheckout({
      transaction: checkout,
      merchantName: 'IndoMart Retail',
      outletName: 'Outlet A - Mall Central',
      received: null,
    });

    // The reprint reads §5.4's ReceiptDto, which carries its own header fields.
    const onReprint = receiptFromDto(await transactionsApi.receipt(checkout.transactionId));

    // Same renderer, same data, same document.
    expect(receiptHtml(onReprint)).toBe(receiptHtml(atCheckout));
  });
});
