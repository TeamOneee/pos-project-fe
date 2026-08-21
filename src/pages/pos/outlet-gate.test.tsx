/** The Owner's till gate keeps a header. */

import '@/api';

import { act, render, screen } from '@testing-library/react';
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

const DESKTOP = 1400;

async function openTillAs(email: string, width: number) {
  resetDb();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);

  window.innerWidth = width;
  window.history.pushState({}, '', '/pos');

  await act(async () => {
    render(<App />);
    window.dispatchEvent(new Event('resize'));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  });
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.history.pushState({}, '', '/');
});

describe('the POS outlet gate', () => {
  it('gives an Owner a way back out before they have picked an outlet', async () => {
    await openTillAs('owner@indomart.com', DESKTOP);

    expect(await screen.findByText('Pilih outlet untuk kasir')).toBeInTheDocument();

    // The till's own bar, the same one the picked-outlet screen carries.
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/dashboard');

    // Transactions are reachable from the sidebar rather than from the bar, which no longer repeats
    // a destination the navigation already offers.
    expect(screen.getByRole('link', { name: 'Transaksi' })).toHaveAttribute(
      'href',
      '/transactions'
    );
    expect(screen.queryByRole('link', { name: 'Riwayat' })).toBeNull();
  });

  it('offers nothing to switch from until an outlet is chosen', async () => {
    await openTillAs('owner@indomart.com', DESKTOP);
    await screen.findByText('Pilih outlet untuk kasir');

    // "Ganti Outlet" would be asking them to change a choice they have not made.
    expect(screen.queryByRole('button', { name: 'Ganti Outlet' })).toBeNull();
  });

  it('does not gate a Cashier, whose outlet comes from the token', async () => {
    await openTillAs('budi@indomart.com', DESKTOP);

    expect(screen.queryByText('Pilih outlet untuk kasir')).toBeNull();
    // Straight to the till, and no way back: it is their workstation.
    expect(screen.queryByRole('link', { name: 'Kembali' })).toBeNull();
  });
});
