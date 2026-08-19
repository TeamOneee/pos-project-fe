/**
 * S-06 · Outlet.
 *
 * The screen is Owner-only by route, so the interesting assertions are the ones
 * about the writes: a created outlet actually lands ACTIVE in the store, and a
 * deactivation goes through the confirmation dialog and retires the row —
 * without deleting it (§2.2 has no DELETE).
 */

import '@/api';

import { act, render, screen, within } from '@testing-library/react';
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

async function signInAsOwner() {
  resetDb();
  const result = await authApi.login({ email: 'owner@indomart.com', password: 'password123' });
  setToken(result.accessToken);
}

async function openOutlets() {
  window.history.pushState({}, '', '/outlets');
  await act(async () => {
    render(<App />);
  });
}

/** React tracks the value setter, so a raw `.value =` does not fire onChange. */
function setInputValue(element: HTMLElement, value: string) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');
});

describe('S-06 · outlets list', () => {
  it('renders every seeded outlet as a card', async () => {
    await signInAsOwner();
    await openOutlets();

    expect(await screen.findByText('Outlet A - Mall Central')).toBeInTheDocument();
    expect(screen.getByText('Outlet B - City Plaza')).toBeInTheDocument();
    expect(screen.getByText('Outlet C - Grand Square')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Tambah Outlet' })).toBeInTheDocument();
  });

  it('opens a row menu with Edit and Nonaktifkan', async () => {
    await signInAsOwner();
    await openOutlets();

    const menu = await screen.findByRole('button', { name: 'Menu untuk Outlet A - Mall Central' });
    await act(async () => {
      menu.click();
    });

    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Nonaktifkan' })).toBeInTheDocument();
  });

  it('creates an outlet that is born ACTIVE', async () => {
    await signInAsOwner();
    await openOutlets();

    const before = getDb().outlets.length;

    await act(async () => {
      screen.getByRole('button', { name: '+ Tambah Outlet' }).click();
    });

    const dialog = await screen.findByRole('dialog');
    setInputValue(within(dialog).getByLabelText(/Nama Outlet/), 'Outlet D - New Mall');
    setInputValue(within(dialog).getByLabelText(/Alamat/), 'Jl. Malioboro No. 1, Yogyakarta');

    await act(async () => {
      within(dialog).getByRole('button', { name: 'Tambah Outlet' }).click();
    });

    expect(await screen.findByText('Outlet ditambahkan')).toBeInTheDocument();
    expect(getDb().outlets).toHaveLength(before + 1);

    const created = getDb().outlets[getDb().outlets.length - 1];
    expect(created.name).toBe('Outlet D - New Mall');
    expect(created.status).toBe('ACTIVE');
  });

  it('deactivates an outlet without deleting it', async () => {
    await signInAsOwner();
    await openOutlets();

    const menu = await screen.findByRole('button', { name: 'Menu untuk Outlet A - Mall Central' });
    await act(async () => {
      menu.click();
    });

    await act(async () => {
      screen.getByRole('menuitem', { name: 'Nonaktifkan' }).click();
    });

    const dialog = await screen.findByRole('dialog');
    await act(async () => {
      within(dialog).getByRole('button', { name: 'Nonaktifkan' }).click();
    });

    expect(await screen.findByText('Outlet dinonaktifkan')).toBeInTheDocument();

    const outlet = getDb().outlets.find((entry) => entry.id === 'otl_a');
    expect(outlet?.status).toBe('INACTIVE');
    expect(getDb().outlets.some((entry) => entry.id === 'otl_a')).toBe(true);
  });
});
