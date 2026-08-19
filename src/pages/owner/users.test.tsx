/**
 * S-08 · Staf.
 *
 * Owner only, by route and by matrix, so the tests focus on the reads and
 * writes that carry the contract's two rules: a cashier lands on exactly one
 * outlet, an admin on none — and the Owner's own row offers no actions the
 * endpoint would refuse. The route gate is checked too, because an Admin
 * typing /users is the failure mode the matrix exists to prevent.
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

async function signInAs(email: string) {
  resetDb();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);
}

async function openUsers() {
  window.history.pushState({}, '', '/users');
  await act(async () => {
    render(<App />);
  });
}

/** React tracks the value setter, so a raw `.value =` does not fire onChange. */
function setInputValue(element: HTMLElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Opens a Radix select by its field label and picks one option. */
async function pickOption(label: RegExp, optionName: string) {
  const trigger = screen.getByLabelText(label);
  await act(async () => {
    trigger.click();
  });
  // Radix options carry no accessible name in jsdom, so match on their text.
  const options = await screen.findAllByRole('option');
  const option = options.find((entry) => entry.textContent?.includes(optionName));
  if (!option) throw new Error(`Option "${optionName}" not found`);
  await act(async () => {
    option.click();
  });
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  // Radix Select scrolls its items into view on open; jsdom has no such method.
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');
});

describe('S-08 · staff list', () => {
  it('renders the seeded staff with role, outlet and footer', async () => {
    await signInAs('owner@indomart.com');
    await openUsers();

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Sari Dewi')).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('Rudi Hartono')).toBeInTheDocument();

    // Roles read in Bahasa, and outlets resolve to names the page fetched.
    // "Pemilik" also names the session in the sidebar, hence the counts.
    expect(screen.getAllByText('Pemilik').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kasir').length).toBeGreaterThanOrEqual(3);
    // Budi and Ani both serve Outlet A.
    expect(screen.getAllByText('Outlet A - Mall Central').length).toBeGreaterThanOrEqual(2);

    // Owner and Admin carry no outlet, so their cell is an em-dash.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);

    expect(await screen.findByText('Menampilkan 1–5 dari 5')).toBeInTheDocument();
  });

  it('gives the Owner no row menu but others Edit, Reset Password and Nonaktifkan', async () => {
    await signInAs('owner@indomart.com');
    await openUsers();

    // The Owner's own row cannot be edited or deactivated through this endpoint.
    await screen.findByText('John Doe');
    expect(screen.queryByRole('button', { name: 'Menu untuk John Doe' })).toBeNull();

    const menu = await screen.findByRole('button', { name: 'Menu untuk Budi Santoso' });
    await act(async () => {
      menu.click();
    });

    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Reset Password' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Nonaktifkan' })).toBeInTheDocument();
  });

  it('creates a cashier assigned to exactly one outlet', async () => {
    await signInAs('owner@indomart.com');
    await openUsers();

    const before = getDb().staff.length;

    await act(async () => {
      screen.getByRole('button', { name: '+ Tambah Staf' }).click();
    });

    const dialog = await screen.findByRole('dialog');
    setInputValue(within(dialog).getByLabelText(/Nama Lengkap/), 'Dewi Lestari');
    setInputValue(within(dialog).getByLabelText(/Email/), 'dewi@indomart.com');
    setInputValue(within(dialog).getByLabelText(/Password/), 'password123');
    await pickOption(/Outlet/, 'Outlet B - City Plaza');

    await act(async () => {
      within(dialog).getByRole('button', { name: 'Tambah Staf' }).click();
    });

    expect(await screen.findByText('Staf ditambahkan')).toBeInTheDocument();
    expect(getDb().staff).toHaveLength(before + 1);

    const created = getDb().staff[getDb().staff.length - 1];
    expect(created.name).toBe('Dewi Lestari');
    expect(created.role).toBe('CASHIER');
    expect(created.outlet_id).toBe('otl_b');
  });

  it('deactivates a staff member without deleting the account', async () => {
    await signInAs('owner@indomart.com');
    await openUsers();

    const menu = await screen.findByRole('button', { name: 'Menu untuk Budi Santoso' });
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

    expect(await screen.findByText('Staf dinonaktifkan')).toBeInTheDocument();

    const budi = getDb().staff.find((entry) => entry.user_id === 'usr_budi');
    expect(budi?.status).toBe('INACTIVE');
    expect(getDb().staff.some((entry) => entry.user_id === 'usr_budi')).toBe(true);
  });

  it('answers 403 for an Admin who types /users', async () => {
    await signInAs('sari@indomart.com');
    await openUsers();

    expect(await screen.findByText('Akses ditolak')).toBeInTheDocument();
  });
});
