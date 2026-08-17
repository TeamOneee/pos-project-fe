/**
 * S-15's two variants, checked at the DOM.
 *
 * The read-only requirement is not "the Owner does not see buttons" — it is
 * that the buttons are not in the tree. A CSS-hidden control is still tabbable,
 * still clickable from the accessibility tree, and still a lie about what the
 * screen does. These tests query the whole document rather than what is
 * visible, so a `hidden` class would not save them.
 */

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

/** Mutation affordances that must never reach an Owner's inventory screen. */
const ADMIN_ONLY_LABELS = [/update massal/i, /transfer stok/i, /^sesuaikan$/i];

async function signInAs(email: string) {
  resetDb();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);
}

async function openInventory() {
  render(<App />);
  await act(async () => {
    window.history.pushState({}, '', '/inventory');
    window.dispatchEvent(new PopStateEvent('popstate'));
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

    expect(screen.getByRole('button', { name: /update massal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transfer stok/i })).toBeInTheDocument();
  });

  it('renders the Owner variant with no mutation affordance in the DOM', async () => {
    await signInAs('owner@indomart.com');
    await openInventory();

    expect(
      await screen.findByText('Tampilan hanya-baca. Penyesuaian stok dilakukan oleh Admin.')
    ).toBeInTheDocument();

    // Pick an outlet so the table renders — the action column is the point.
    const outletPill = await screen.findByRole('radio', { name: /Outlet A/i });
    await act(async () => {
      outletPill.click();
    });

    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /Lihat stok .* per outlet/i }).length
      ).toBeGreaterThan(0);
    });

    // Absent, not hidden: nothing in the whole document matches.
    for (const label of ADMIN_ONLY_LABELS) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(screen.queryByText('Aksi')).toBeNull();
  });
});
