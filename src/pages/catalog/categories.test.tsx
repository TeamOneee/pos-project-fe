/**
 * S-13, and the one piece of copy on it that carries a consequence.
 *
 * The deactivate dialog has to say what breaks: no new products can use the
 * category, and the products already using it stay put while disappearing from
 * the cashier's catalog. That second half is the part a user cannot infer, so it
 * is asserted rather than left to review.
 */

import '@/api';

import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { resetDb } from '@/api/mock/db';
import { setToken } from '@/api/token';
import { authApi } from '@/services';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function signInAs(email: string) {
  resetDb();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);
}

async function openCategories() {
  render(<App />);
  await act(async () => {
    window.history.pushState({}, '', '/categories');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');
});

describe('S-13 · categories', () => {
  it('lists the categories with a product count', async () => {
    await signInAs('sari@indomart.com');
    await openCategories();

    expect(await screen.findByText('Minuman')).toBeInTheDocument();
    expect(screen.getByText('Jumlah Produk')).toBeInTheDocument();
  });

  it('states the consequence before deactivating', async () => {
    await signInAs('sari@indomart.com');
    await openCategories();

    const menu = await screen.findByRole('button', { name: 'Menu untuk Minuman' });
    await act(async () => {
      menu.click();
    });
    await act(async () => {
      screen.getByRole('menuitem', { name: 'Nonaktifkan' }).click();
    });

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/tidak akan bisa dipilih untuk produk baru/i)
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/hilang dari katalog kasir/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/tetap ada dan tidak berubah/i)).toBeInTheDocument();
  });

  it('renders the Owner variant with no mutation affordance in the DOM', async () => {
    await signInAs('owner@indomart.com');
    await openCategories();

    expect(
      await screen.findByText('Tampilan hanya-baca. Katalog dikelola oleh Admin.')
    ).toBeInTheDocument();
    await screen.findByText('Minuman');

    expect(screen.queryByRole('button', { name: /\+ tambah kategori/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /menu untuk/i })).toBeNull();
    expect(screen.queryByText('Aksi')).toBeNull();
  });
});
