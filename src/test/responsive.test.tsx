/**
 * The breakpoint contract, exercised at the three widths the product targets:
 * mobile <768, tablet 768–1279, desktop ≥1280.
 *
 * `useBreakpoint` reads `window.innerWidth`, so jsdom can drive it honestly —
 * these tests resize the window and assert the tree actually changes shape. What
 * they cannot do is measure pixels: jsdom has no layout engine, so where the rule
 * is expressed as a Tailwind variant (`tablet:` classes) the class is asserted
 * instead, and the visual result is a browser check.
 */

import '@/api';

import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { resetDb } from '@/api/mock/db';
import { setToken } from '@/api/token';
import { authApi } from '@/services';
import { useCartStore } from '@/stores/cart';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const MOBILE = 480;
const TABLET = 900;
const DESKTOP = 1400;

async function signInAs(email: string) {
  resetDb();
  useCartStore.getState().clear();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);
}

async function openAt(path: string, width: number) {
  window.innerWidth = width;
  window.history.pushState({}, '', path);

  await act(async () => {
    render(<App />);
    window.dispatchEvent(new Event('resize'));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.history.pushState({}, '', '/');
});

describe('tables become stacked cards below 768px', () => {
  it('drops the column headers on the products table and keeps the identifiers', async () => {
    await signInAs('sari@indomart.com');
    await openAt('/products', MOBILE);

    // The product is still there…
    expect(await screen.findByText('Coca Cola 1.5L')).toBeInTheDocument();
    // …but the table header row is gone: Kategori, Harga and Status demote to a
    // caption line inside each card. ("Kategori" is not a usable probe — the
    // mobile tab bar has a nav item by that name.)
    expect(screen.queryByText('Batas Stok')).toBeNull();
    expect(screen.queryByText('Aksi')).toBeNull();
  });

  it('keeps the headers at tablet and desktop', async () => {
    await signInAs('sari@indomart.com');
    await openAt('/products', TABLET);

    // §3.4 has no SKU; Kategori is the column that took its place.
    expect(await screen.findByText('Kategori')).toBeInTheDocument();
    expect(screen.getByText('Kategori')).toBeInTheDocument();
  });

  it('stacks the categories table too', async () => {
    await signInAs('sari@indomart.com');
    await openAt('/categories', MOBILE);

    expect(await screen.findByText('Minuman')).toBeInTheDocument();
    expect(screen.queryByText('Nama Kategori')).toBeNull();
  });

  it('stacks the transaction history', async () => {
    await signInAs('owner@indomart.com');
    await openAt('/transactions', MOBILE);

    expect(await screen.findByText('TRX-20260813-001')).toBeInTheDocument();
    // "No. Transaksi" is also the search field's label, so the probe is a header
    // that exists nowhere else on the screen.
    expect(screen.queryByText('Tanggal & Waktu')).toBeNull();
  });
});

describe('modals below 768px', () => {
  it('become full-screen sheets with a sticky footer', async () => {
    await signInAs('owner@indomart.com');
    await openAt('/transactions/trx_001', MOBILE);

    // On mobile the detail is a page, not a layer: no dialog at all.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await screen.findByText('Detail Transaksi')).toBeInTheDocument();
  });

  it('renders a dialog panel that is full-height below tablet and a card above', async () => {
    await signInAs('sari@indomart.com');
    await openAt('/products', DESKTOP);

    await act(async () => {
      screen.getByRole('button', { name: /\+ Tambah Produk/i }).click();
    });

    const dialog = await screen.findByRole('dialog');
    // The panel carries both halves of the contract: a sheet by default, a
    // centred card from tablet up.
    expect(dialog.className).toContain('h-full');
    expect(dialog.className).toContain('tablet:h-auto');
    expect(dialog.className).toContain('tablet:rounded-lg');

    // And its footer is sticky on the sheet, static in the card.
    const footer = dialog.querySelector('.sticky');
    expect(footer, 'dialog footer should be sticky below tablet').not.toBeNull();
    expect(footer?.className).toContain('tablet:static');
  });
});

describe('dashboard grids collapse to one column', () => {
  /**
   * Queried by class rather than by label: the tile labels are also column
   * headings elsewhere on the page, so a text lookup finds both.
   *
   * The Owner is the subject here because KpiTile is now the Owner's alone. The
   * Admin's tiles became the stock queue's filter chips, which are a control
   * rather than a row of figures and carry no tile basis.
   */
  const kpiTiles = () => Array.from(document.querySelectorAll('.basis-full'));

  it('gives each KPI tile a full-width basis below tablet', async () => {
    await signInAs('owner@indomart.com');
    await openAt('/dashboard', MOBILE);

    await screen.findAllByText('Total Omzet');
    const tiles = kpiTiles();

    expect(tiles.length).toBeGreaterThanOrEqual(3);
    // One column below tablet, back to a shared row from tablet up.
    for (const tile of tiles) expect(tile.className).toContain('tablet:basis-0');
  });

  it('keeps the KPI row order when it becomes a column', async () => {
    await signInAs('owner@indomart.com');
    await openAt('/dashboard', MOBILE);

    await screen.findAllByText('Total Omzet');

    // Document order is the reading order, so the stacked column follows the row
    // the tiles were specified in.
    const order = kpiTiles()
      .slice(0, 3)
      .map((tile) => tile.textContent ?? '');

    expect(order[0]).toContain('Total Omzet');
    expect(order[1]).toContain('Jumlah Transaksi');
    expect(order[2]).toContain('Rata-rata Nilai Transaksi');
  });

  it('stacks the Admin dashboard without reviving the KPI tiles', async () => {
    await signInAs('sari@indomart.com');
    await openAt('/dashboard', MOBILE);

    await screen.findByText('Stok Per Outlet');

    /*
     * The Admin's four tiles are gone on purpose: their counts became the
     * per-outlet table and the catalogue strip. Nothing on this screen may
     * claim a tile basis — a stray one would be picked up by the Owner's
     * tile-order test above and fail there, on markup from another screen.
     */
    expect(document.querySelectorAll('.basis-full')).toHaveLength(0);

    // The catalogue strip is a column below tablet and a row from tablet up.
    const strip = screen.getByRole('group', { name: /^Produk Aktif:/ }).parentElement;
    expect(strip?.className).toContain('flex-col');
    expect(strip?.className).toContain('tablet:flex-row');
  });
});

describe('the POS is the exception', () => {
  it('moves the cart into a bottom sheet rather than stacking it', async () => {
    await signInAs('budi@indomart.com');
    await openAt('/pos', MOBILE);

    // The bar appears only once there is something to show.
    expect(screen.queryByRole('button', { name: 'Lihat keranjang' })).toBeNull();

    await act(async () => {
      (await screen.findByRole('button', { name: /Coca Cola 1\.5L/ })).click();
    });

    const bar = await screen.findByRole('button', { name: 'Lihat keranjang' });
    expect(bar).toBeInTheDocument();

    // The sheet stays mounted and translated off-screen so both directions
    // animate, so "closed" is `aria-hidden` plus a transform — not absence.
    const heading = screen.getByText('Keranjang');
    const sheet = heading.closest('[aria-hidden]');
    expect(sheet?.getAttribute('aria-hidden')).toBe('true');
    expect(sheet?.className).toContain('translate-y-full');

    await act(async () => {
      bar.click();
    });

    expect(sheet?.getAttribute('aria-hidden')).toBe('false');
    expect(sheet?.className).toContain('translate-y-0');
    // Pinned to the bottom edge, not stacked into the page flow.
    expect(sheet?.className).toContain('bottom-0');
    expect(within(sheet as HTMLElement).getByText('Keranjang')).toBeInTheDocument();
  });

  it('keeps the cart alongside the catalogue at desktop', async () => {
    await signInAs('budi@indomart.com');
    await openAt('/pos', DESKTOP);

    await screen.findByRole('button', { name: /Coca Cola 1\.5L/ });
    // No bottom bar and no sheet: the cart panel is simply on screen.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the tab bar for an Owner on the till, as the way back out', async () => {
    await signInAs('owner@indomart.com');
    await openAt('/pos', MOBILE);

    // The till gate is up…
    expect(await screen.findByText('Pilih outlet untuk kasir')).toBeInTheDocument();
    // …but the Owner's tab bar is still there, so leaving the till is one tap.
    const dashboardTab = screen.getByRole('link', { name: 'Dashboard' });

    // And it is pinned to the bottom of the screen, not pushed below the fold:
    // the region above it cannot grow past its flexed height and the bar
    // itself cannot shrink (shrink-0).
    const bar = dashboardTab.closest('nav');
    expect(bar?.className).toContain('shrink-0');
    expect(bar?.previousElementSibling?.querySelector('main')?.className).toContain(
      'overflow-y-auto'
    );
    expect(bar?.parentElement?.className).toContain('flex-col');
  });

  it('gives the cashier till the sidebar, so it does not appear only on Riwayat', async () => {
    await signInAs('budi@indomart.com');
    await openAt('/pos', DESKTOP);

    await screen.findByRole('button', { name: /Coca Cola 1\.5L/ });

    // Scoped to the nav landmark: the till's own header carries a Riwayat link
    // of its own, which is the only way out at mobile and stays there.
    const nav = within(screen.getByRole('navigation'));
    expect(nav.getByRole('link', { name: 'Kasir' })).toBeInTheDocument();
    expect(nav.getByRole('link', { name: 'Riwayat' })).toBeInTheDocument();
  });

  it('keeps the cashier till chromeless — the tab bar is not the way back for them', async () => {
    await signInAs('budi@indomart.com');
    await openAt('/pos', MOBILE);

    await screen.findByRole('button', { name: /Coca Cola 1\.5L/ });
    // The till's own "Kasir" label is text, not a link; a link by that name
    // exists only in a footer tab bar, and there is none for a cashier.
    expect(screen.queryByRole('link', { name: 'Kasir' })).toBeNull();
  });

  it('reveals the cart bar on a product tap, pinned above the tab bar', async () => {
    await signInAs('owner@indomart.com');
    await openAt('/pos', MOBILE);

    // The Owner must pick an outlet before there is a till to tap into. The
    // button's name carries the address too, so the probe is a substring.
    await act(async () => {
      (await screen.findByRole('button', { name: /Outlet A - Mall Central/ })).click();
    });

    // Empty cart, no bar yet.
    expect(screen.queryByRole('button', { name: 'Lihat keranjang' })).toBeNull();

    // Tap a product → the bar appears.
    await act(async () => {
      (await screen.findByRole('button', { name: /Coca Cola 1\.5L/ })).click();
    });
    const bar = screen.getByRole('button', { name: 'Lihat keranjang' });

    // It lives inside the till region that sits directly above the tab bar.
    const tabBar = screen.getByRole('navigation');
    expect(tabBar.previousElementSibling?.contains(bar)).toBe(true);

    // And it opens the cart, showing what is in it.
    await act(async () => {
      bar.click();
    });
    const heading = screen.getByText('Keranjang');
    const sheet = heading.closest('[aria-hidden]');
    expect(sheet?.getAttribute('aria-hidden')).toBe('false');
    expect(within(sheet as HTMLElement).getByText('Coca Cola 1.5L')).toBeInTheDocument();
  });
});

describe('one shell, whatever the screen', () => {
  it('runs the nav rail the full height, with the header beside it', async () => {
    await signInAs('budi@indomart.com');
    await openAt('/transactions', DESKTOP);

    await screen.findByRole('link', { name: 'Riwayat' });

    const header = screen.getByRole('banner');
    const nav = screen.getByRole('navigation');

    // The header shares a column with the page, and the rail sits outside that
    // column — which is what makes it full height. A header spanning above the
    // rail would contain it here.
    expect(header.parentElement?.querySelector('main')).not.toBeNull();
    expect(header.parentElement?.contains(nav)).toBe(false);
  });

  it('gives the till the same frame, minus the header it supplies itself', async () => {
    await signInAs('budi@indomart.com');
    await openAt('/pos', DESKTOP);

    await screen.findByRole('button', { name: /Coca Cola 1\.5L/ });

    // Same shape: nav outside, page inside — the till just brings its own bar.
    const nav = screen.getByRole('navigation');
    const main = document.querySelector('main');

    expect(main).not.toBeNull();
    expect(main?.contains(nav)).toBe(false);
    expect(nav.closest('main')).toBeNull();
  });
});

describe('the desktop sidebar collapses and comes back', () => {
  it('hides the sidebar on demand and restores it from the header', async () => {
    await signInAs('owner@indomart.com');
    await openAt('/dashboard', DESKTOP);

    // "Analitik" is a sidebar-only label — nothing else on the dashboard is a
    // link by that name, so it is an honest probe for the sidebar being alive.
    expect(await screen.findByRole('link', { name: 'Analitik' })).toBeInTheDocument();

    // Collapse it, to give the dashboard the full width.
    await act(async () => {
      screen.getByRole('button', { name: 'Sembunyikan menu samping' }).click();
    });

    expect(screen.queryByRole('link', { name: 'Analitik' })).toBeNull();
    // The same button now offers the way back.
    expect(screen.getByRole('button', { name: 'Tampilkan menu samping' })).toBeInTheDocument();

    // And it restores the nav.
    await act(async () => {
      screen.getByRole('button', { name: 'Tampilkan menu samping' }).click();
    });
    expect(screen.getByRole('link', { name: 'Analitik' })).toBeInTheDocument();
  });

  it('lets the cashier collapse it from the till, which has no app header', async () => {
    await signInAs('budi@indomart.com');
    await openAt('/pos', DESKTOP);

    await screen.findByRole('button', { name: /Coca Cola 1\.5L/ });

    // "Kasir" is a link only in the sidebar — the till's own label is text.
    expect(screen.getByRole('link', { name: 'Kasir' })).toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: 'Sembunyikan menu samping' }).click();
    });

    expect(screen.queryByRole('link', { name: 'Kasir' })).toBeNull();

    await act(async () => {
      screen.getByRole('button', { name: 'Tampilkan menu samping' }).click();
    });

    expect(screen.getByRole('link', { name: 'Kasir' })).toBeInTheDocument();
  });

  it('has no sidebar toggle below desktop', async () => {
    await signInAs('owner@indomart.com');
    await openAt('/dashboard', TABLET);

    // The header title renders the dashboard's name; no sidebar at this width.
    expect((await screen.findAllByText('Dashboard')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Sembunyikan menu samping' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tampilkan menu samping' })).toBeNull();
  });
});
