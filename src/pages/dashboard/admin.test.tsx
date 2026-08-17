/**
 * S-14, and the thing that makes it trustworthy: an adjustment made anywhere
 * has to move the counts on this screen.
 *
 * Every figure on the Admin dashboard is derived server-side from current
 * stock, so a write that does not invalidate `['dashboard']` leaves an Admin
 * looking at a "Stok Habis: 3" tile after they have just refilled one of the
 * three. The test drives the real modal against the mock API and watches the
 * tile, rather than asserting on the invalidation call — the call is the
 * mechanism, the moving number is the requirement.
 */

import '@/api';

import { act, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { getDb, resetDb } from '@/api/mock/db';
import { setToken } from '@/api/token';
import { authApi } from '@/services';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** The KPI tile is a button labelled "<name>: <value>. <hint>". */
function tileValue(label: string): number {
  const tile = screen.getByRole('button', { name: new RegExp(`^${label}:`) });
  const match = /:\s*([\d.]+)/.exec(tile.getAttribute('aria-label') ?? '');
  return Number((match?.[1] ?? '').replace(/\./g, ''));
}

beforeEach(async () => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');

  resetDb();
  const result = await authApi.login({ email: 'sari@indomart.com', password: 'password123' });
  setToken(result.accessToken);
});

describe('S-14 · admin stock dashboard', () => {
  it('is where the Admin lands', async () => {
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'), { timeout: 4000 });
    expect(
      await screen.findByText('Ringkasan ketersediaan produk di seluruh outlet.')
    ).toBeInTheDocument();
  });

  it('keeps the alert cards mounted with a success state when nothing is wrong', async () => {
    // Refill everything, so both alert lists come back empty.
    getDb().inventory.forEach((row) => {
      row.quantity = 500;
    });

    render(<App />);

    expect(await screen.findByText('Peringatan Stok Menipis')).toBeInTheDocument();
    expect(await screen.findByText('Produk Stok Habis')).toBeInTheDocument();
    expect(await screen.findAllByText('Semua stok dalam kondisi aman.')).toHaveLength(2);
  });

  it('moves the KPI counts after an adjustment made from the low-stock card', async () => {
    render(<App />);

    await screen.findByText('Peringatan Stok Menipis');
    await waitFor(() => expect(tileValue('Stok Menipis')).toBeGreaterThan(0));

    const before = tileValue('Stok Menipis');

    // Adjust the most urgent row well clear of the threshold.
    const [adjustButton] = await screen.findAllByRole('button', { name: 'Sesuaikan Stok' });
    await act(async () => {
      adjustButton?.click();
    });

    const dialog = await screen.findByRole('dialog');
    const quantity = within(dialog).getByLabelText('Stok baru');
    const reason = within(dialog).getByLabelText(/Alasan/);

    await act(async () => {
      setInputValue(quantity, '250');
      setInputValue(reason, 'Restock dari supplier');
    });

    await act(async () => {
      within(dialog).getByRole('button', { name: /simpan perubahan/i }).click();
    });

    // The dashboard refetches because the write invalidated ['dashboard'].
    await waitFor(() => expect(tileValue('Stok Menipis')).toBe(before - 1), { timeout: 4000 });
  });
});

/** React tracks the value setter, so a raw `.value =` does not fire onChange. */
function setInputValue(element: HTMLElement, value: string) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
