/**
 * S-10 · Pengaturan Merchant.
 *
 * The only write on this screen is the merchant name (§2.2), and the only way
 * to get it wrong is to promise a save the API cannot perform — so the tests
 * check the field follows the query, the save actually lands in the store, and
 * "Batal" returns the field to the server's truth rather than the form's.
 */

import '@/api';

import { act, render, screen, waitFor } from '@testing-library/react';
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

async function openMerchant() {
  window.history.pushState({}, '', '/merchant');
  await act(async () => {
    render(<App />);
  });
}

/** React tracks the value setter, so a raw `.value =` does not fire onChange. */
function setInputValue(element: HTMLElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');
});

describe('S-10 · merchant settings', () => {
  it('shows the merchant name and when it was created', async () => {
    await signInAsOwner();
    await openMerchant();

    const input = await screen.findByLabelText(/Nama Merchant/);
    expect(input).toHaveValue('IndoMart Retail');
    expect(screen.getByText('Dibuat pada 1 Agu 2026')).toBeInTheDocument();
  });

  it('leaves Simpan Perubahan disabled until the name is dirty', async () => {
    await signInAsOwner();
    await openMerchant();

    const save = await screen.findByRole('button', { name: 'Simpan Perubahan' });
    expect(save).toBeDisabled();

    setInputValue(await screen.findByLabelText(/Nama Merchant/), 'IndoMart Baru');
    await waitFor(() => expect(save).toBeEnabled());
  });

  it('persists a renamed merchant through the real mutation', async () => {
    await signInAsOwner();
    await openMerchant();

    setInputValue(await screen.findByLabelText(/Nama Merchant/), 'IndoMart Baru');
    const save = await screen.findByRole('button', { name: 'Simpan Perubahan' });

    await act(async () => {
      save.click();
    });

    expect(await screen.findByText('Profil merchant diperbarui')).toBeInTheDocument();
    expect(getDb().merchant.name).toBe('IndoMart Baru');
  });

  it('restores the saved name when Batal is pressed', async () => {
    await signInAsOwner();
    await openMerchant();

    const input = await screen.findByLabelText(/Nama Merchant/);
    setInputValue(input, 'IndoMart Salah Ketik');

    const batal = await screen.findByRole('button', { name: 'Batal' });
    await act(async () => {
      batal.click();
    });

    await waitFor(() => expect(input).toHaveValue('IndoMart Retail'));
  });
});
