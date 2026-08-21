/** S-15, checked at the DOM. */

import '@/api';

import { act, render, screen, waitFor, within } from '@testing-library/react';
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

async function openInventory() {
  window.history.pushState({}, '', '/inventory');
  await act(async () => {
    render(<App />);
  });
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');
});

describe('S-15 · inventory', () => {
  it('shows the empty state until an outlet is chosen', async () => {
    await signInAs('sari@indomart.com');
    await openInventory();

    expect(await screen.findByText('Pilih outlet untuk melihat stok.')).toBeInTheDocument();
  });

  it('renders a pill row when there are four outlets or fewer', async () => {
    await signInAs('sari@indomart.com');
    await openInventory();

    // The seed has three outlets, so the picker is a radiogroup, not a select.
    const group = await screen.findByRole('radiogroup', { name: 'Outlet' });
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
  });

  it('gives the Admin the mutation affordances', async () => {
    await signInAs('sari@indomart.com');
    await openInventory();

    await screen.findByRole('radiogroup', { name: 'Outlet' });

    // Bulk update and transfer are gone with their endpoints (§4.2): stock is adjusted one product
    // at a time, from the row.
    expect(screen.queryByRole('button', { name: /update massal/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /transfer stok/i })).toBeNull();
  });

  it('gives the Owner the same mutation affordances as the Admin', async () => {
    await signInAs('owner@indomart.com');
    await openInventory();

    await screen.findByRole('radiogroup', { name: 'Outlet' });

    // Pick an outlet so the table renders — the action column is the point.
    const outletPill = await screen.findByRole('radio', { name: /Outlet A/i });
    await act(async () => {
      outletPill.click();
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Sesuaikan/i }).length).toBeGreaterThan(0);
    });

    // Bulk update and transfer are gone with their endpoints (§4.2): stock is adjusted one product
    // at a time, from the row.
    expect(screen.queryByRole('button', { name: /update massal/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /transfer stok/i })).toBeNull();
    expect(screen.queryByText('Tampilan hanya-baca')).toBeNull();
  });
});
