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
   * Queried by class rather than by label: "Produk Aktif" and "Stok Menipis" also
   * appear as column headings in the per-outlet table below, so a text lookup
   * finds four tiles and four table cells.
   */
  const kpiTiles = () => Array.from(document.querySelectorAll('.basis-full'));

  it('gives each KPI tile a full-width basis below tablet', async () => {
    await signInAs('sari@indomart.com');
    await openAt('/dashboard', MOBILE);

    await screen.findAllByText('Produk Aktif');
    const tiles = kpiTiles();

    expect(tiles.length).toBeGreaterThanOrEqual(4);
    // One column below tablet, back to a shared row from tablet up.
    for (const tile of tiles) expect(tile.className).toContain('tablet:basis-0');
  });

  it('keeps the KPI row order when it becomes a column', async () => {
    await signInAs('sari@indomart.com');
    await openAt('/dashboard', MOBILE);

    await screen.findAllByText('Produk Aktif');

    // Document order is the reading order, so the stacked column follows the row
    // the tiles were specified in.
    const order = kpiTiles()
      .slice(0, 4)
      .map((tile) => tile.textContent ?? '');

    expect(order[0]).toContain('Produk Aktif');
    expect(order[1]).toContain('Produk Berstok');
    expect(order[2]).toContain('Stok Menipis');
    expect(order[3]).toContain('Stok Habis');
  });
});

describe('the POS is the exception', () => {
  it('moves the cart into a bottom sheet rather than stacking it', async () => {
    await signInAs('budi@indomart.com');
    await openAt('/pos', MOBILE);

    // The cart is behind a bar at the bottom, not a panel in the flow.
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
});
