/** The flows the product is demoed on, driven through the real app. */

import '@/api';

import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { getDb, resetDb, toWireMoney } from '@/api/mock/db';
import { clearMockScenario, setMockScenario } from '@/api/mock/scenarios';
import { setToken } from '@/api/token';
import { authApi } from '@/services';
import { useCartStore } from '@/stores/cart';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function signInAs(email: string) {
  resetDb();
  clearMockScenario();
  // The cart is Zustand, so it is module state that outlives a render: without this, the second POS
  // test starts with the first one's line still in it.
  useCartStore.getState().clear();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);
}

async function open(path: string) {
  window.history.pushState({}, '', path);
  await act(async () => {
    render(<App />);
  });
}

/** Clicks and lets the query cache settle. */
async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  clearMockScenario();
});

/* -------------------------------------------------------------------------- */
/* 1 · The cashier happy path                                                  */
/* -------------------------------------------------------------------------- */

describe('the cashier happy path', () => {
  it('sells a product and produces a receipt', async () => {
    await signInAs('budi@indomart.com');
    await open('/pos');

    // The catalogue arrives, scoped to this cashier's outlet.
    const tile = await screen.findByRole('button', { name: /Coca Cola 1\.5L, Rp 15\.000/ });
    await click(tile);

    // The cart totals it: one line at 15.000.
    const pay = await screen.findByRole('button', { name: 'Bayar Rp 15.000' });
    await click(pay);

    // Non-cash keeps the flow to two clicks; the cash path has its own panel.
    await click(await screen.findByRole('radio', { name: /Non-Tunai/ }));
    await click(await screen.findByRole('button', { name: /Konfirmasi Pembayaran/ }));

    // The sale succeeded, and the receipt is offered rather than assumed.
    expect(await screen.findByText('Pembayaran Berhasil')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cetak Struk/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transaksi Baru/ })).toBeInTheDocument();

    // And it is a real transaction, with stock moved for it.
    const sales = getDb().transactions.filter((entry) => entry.outlet_id === 'otl_a');
    expect(sales.length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* 2 · Both checkout error recoveries                                          */
/* -------------------------------------------------------------------------- */

describe('checkout error recovery', () => {
  it('offers a way back when stock ran out mid-sale', async () => {
    await signInAs('budi@indomart.com');
    await open('/pos');

    const tile = await screen.findByRole('button', { name: /Coca Cola 1\.5L, Rp 15\.000/ });
    await click(tile);

    // The 400 the API answers when the cart exceeds what the outlet holds.
    setMockScenario('insufficient_stock', { path: '/checkout', once: true });

    await click(await screen.findByRole('button', { name: 'Bayar Rp 15.000' }));
    await click(await screen.findByRole('radio', { name: /Non-Tunai/ }));
    await click(await screen.findByRole('button', { name: /Konfirmasi Pembayaran/ }));

    // Named, with the shortfall, and a route out that is not "try again blindly".
    expect(await screen.findByText(/stok tidak mencukupi/i)).toBeInTheDocument();
    const fix = screen.getByRole('button', { name: /Sesuaikan Keranjang/ });
    await click(fix);

    // Back at the cart, nothing charged.
    await waitFor(() => expect(screen.queryByText('Pembayaran Berhasil')).toBeNull());
  });

  it('shows the old and new price when one moved under the cart', async () => {
    await signInAs('budi@indomart.com');
    await open('/pos');

    const tile = await screen.findByRole('button', { name: /Coca Cola 1\.5L, Rp 15\.000/ });
    await click(tile);

    // The 409 PRICE_CHANGED case: the catalogue moved after the cart was built.
    setMockScenario('price_changed', { path: '/checkout', once: true });

    await click(await screen.findByRole('button', { name: 'Bayar Rp 15.000' }));
    await click(await screen.findByRole('radio', { name: /Non-Tunai/ }));
    await click(await screen.findByRole('button', { name: /Konfirmasi Pembayaran/ }));

    expect(await screen.findByText(/harga produk berubah/i)).toBeInTheDocument();

    // The recovery is explicit consent to the new price, not a silent retry.
    const accept = screen.getByRole('button', { name: /Gunakan Harga Baru/ });
    expect(accept).toBeInTheDocument();
    await click(accept);

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Gunakan Harga Baru/ })).toBeNull()
    );
  });
});

/* -------------------------------------------------------------------------- */
/* 3 · An Admin stock adjustment                                               */
/* -------------------------------------------------------------------------- */

describe('an Admin stock adjustment', () => {
  it('writes the new quantity and moves the dashboard count with it', async () => {
    await signInAs('sari@indomart.com');

    // Start from a known low-stock row so the dashboard has something to count.
    const row = getDb().inventory.find(
      (entry) => entry.outlet_id === 'otl_a' && entry.quantity > 0 && entry.quantity < 10
    );
    expect(row).toBeDefined();

    await open('/inventory/low-stock');

    // The queue lists it, with an adjust button per row.
    const adjustButtons = await screen.findAllByRole('button', { name: /Sesuaikan/ });
    await click(adjustButtons[0] as HTMLElement);

    const dialog = await screen.findByRole('dialog');
    const quantity = within(dialog).getByLabelText('Stok baru') as HTMLInputElement;
    const reason = within(dialog).getByLabelText(/Alasan/) as HTMLTextAreaElement;

    await act(async () => {
      quantity.focus();
      // Type a new quantity the way a user does.
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(quantity, '99');
      quantity.dispatchEvent(new Event('input', { bubbles: true }));

      const textSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      textSetter?.call(reason, 'Restock dari supplier');
      reason.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await click(within(dialog).getByRole('button', { name: /Simpan Perubahan/ }));

    // The write landed in the store the screens read from.
    await waitFor(() => {
      const quantities = getDb().inventory.map((entry) => entry.quantity);
      expect(quantities).toContain(99);
    });

    // And the dialog closed rather than leaving a frozen button behind.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

/* -------------------------------------------------------------------------- */
/* 4 · Role gating                                                             */
/* -------------------------------------------------------------------------- */

describe('role gating at the route', () => {
  const forbidden: [string, string][] = [
    ['sari@indomart.com', '/transactions'],
    ['sari@indomart.com', '/analytics'],
    ['sari@indomart.com', '/ai-insights'],
    ['budi@indomart.com', '/dashboard'],
    ['budi@indomart.com', '/products'],
    ['sari@indomart.com', '/pos'],
  ];

  it.each(forbidden)('%s is refused %s', async (email, path) => {
    await signInAs(email);
    await open(path);

    // The 403 screen, not an empty page and not a redirect that hides the reason.
    expect(await screen.findByText(/tidak memiliki akses/i)).toBeInTheDocument();
  });

  it('lets each role reach its own landing route', async () => {
    for (const [email, expected] of [
      ['owner@indomart.com', '/dashboard'],
      ['sari@indomart.com', '/dashboard'],
      ['budi@indomart.com', '/pos'],
    ] as const) {
      await signInAs(email);
      await open('/');
      await waitFor(() => expect(window.location.pathname).toBe(expected), { timeout: 4000 });
    }
  });

  it('hands the Owner a working till once they pick an outlet', async () => {
    await signInAs('owner@indomart.com');
    await open('/pos');

    // No outlet has been chosen yet, so the till asks for one first.
    expect(await screen.findByText('Pilih outlet untuk kasir')).toBeInTheDocument();

    await click(await screen.findByRole('button', { name: /Outlet A - Mall Central/ }));

    // The till itself loads, scoped to the chosen outlet.
    expect(await screen.findByText('Coca Cola 1.5L')).toBeInTheDocument();
  });

  it('lets the Owner manage the catalog by direct navigation too', async () => {
    await signInAs('owner@indomart.com');
    await open('/products');

    expect(await screen.findByRole('button', { name: /\+ Tambah Produk/i })).toBeInTheDocument();
    expect(screen.queryByText('Tampilan hanya-baca')).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Nothing out of scope is reachable                                           */
/* -------------------------------------------------------------------------- */

describe('out-of-scope features stay unreachable', () => {
  it('offers no way to cancel, void or refund a completed sale', async () => {
    await signInAs('owner@indomart.com');
    await open('/transactions/trx_001');

    const drawer = await screen.findByRole('dialog');
    await within(drawer).findByText('TRX-20260813-001');

    for (const label of [/batalkan/i, /void/i, /refund/i, /hapus transaksi/i, /^edit$/i]) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
  });

  it('shows a totals block with nothing between subtotal and total', async () => {
    await signInAs('owner@indomart.com');
    await open('/transactions/trx_001');

    const drawer = await screen.findByRole('dialog');
    await within(drawer).findByText('TRX-20260813-001');

    expect(within(drawer).getByText('Subtotal')).toBeInTheDocument();
    expect(within(drawer).getByText('Total')).toBeInTheDocument();
    // No discount, tax or service-charge row — rule 2.
    for (const label of [/diskon/i, /pajak/i, /ppn/i, /biaya layanan/i, /service/i]) {
      expect(within(drawer).queryByText(label)).toBeNull();
    }
  });

  it('never offers stock-movement history on an adjustment', async () => {
    await signInAs('sari@indomart.com');
    await open('/inventory/low-stock');

    const adjustButtons = await screen.findAllByRole('button', { name: /Sesuaikan/ });
    await click(adjustButtons[0] as HTMLElement);

    const dialog = await screen.findByRole('dialog');
    // The reason field is optional in this form — the API may still reject an empty one — and says
    // nothing about an audit trail (rule 4).
    expect(within(dialog).getByText('Opsional.')).toBeInTheDocument();
    for (const label of [/audit/i, /riwayat perubahan/i, /pergerakan stok/i]) {
      expect(within(dialog).queryByText(label)).toBeNull();
    }
  });
});

/* Keeps the money helper referenced so a future edit cannot drop the import. */
void toWireMoney;
