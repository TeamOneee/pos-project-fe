/**
 * S-14 · the Admin's landing screen, which is now a reference screen: a per-outlet stock table and
 * the catalogue figures, and no work queue.
 */

import '@/api';

import { render, screen, waitFor } from '@testing-library/react';
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

  it('counts Produk Berstok as the rows that have stock, not every row', async () => {
    render(<App />);
    await screen.findByText('Stok Per Outlet');

    const rows = getDb().inventory;
    const inStock = rows.filter((row) => row.quantity > 0).length;
    // If the fixture has no empty shelves this test proves nothing, so say so.
    expect(inStock).toBeLessThan(rows.length);

    /**
     * `/dashboard/operations` reports `inventory_item_count` as every row it holds, empties
     * included.
     */
    expect(
      await screen.findByRole('group', { name: `Produk Berstok: ${inStock}` })
    ).toBeInTheDocument();
  });
});
