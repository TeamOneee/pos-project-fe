/**
 * The restocking queue, and the thing that makes it trustworthy: an adjustment made from a row has
 * to move the counts on the same screen.
 */

import '@/api';

import { act, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { HEALTHY_COPY } from '@/components/pages/inventory/stock-queue';
import { getDb, resetDb } from '@/api/mock/db';
import { setToken } from '@/api/token';
import { authApi } from '@/services';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** The queue's counters are its filter chips — `role="tab"`, labelled "Menipis 10". */
function chipCount(name: 'Semua' | 'Habis' | 'Menipis'): number {
  const tab = screen.getByRole('tab', { name: new RegExp(`^${name}\\s`) });
  return Number((tab.textContent ?? '').replace(/\D/g, ''));
}

async function clickChip(name: 'Semua' | 'Habis' | 'Menipis') {
  const tab = screen.getByRole('tab', { name: new RegExp(`^${name}\\s`) });
  await act(async () => {
    tab.click();
  });
}

beforeEach(async () => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/inventory/low-stock');

  resetDb();
  const result = await authApi.login({ email: 'sari@indomart.com', password: 'password123' });
  setToken(result.accessToken);
});

describe('the low-stock queue', () => {
  it('keeps the queue mounted with a success state when nothing is wrong', async () => {
    // Refill everything, so the queue comes back empty.
    getDb().inventory.forEach((row) => {
      row.quantity = 500;
    });

    render(<App />);

    // One queue, one success line. Two separate cards used to print this twice.
    expect(await screen.findAllByText(HEALTHY_COPY)).toHaveLength(1);
    // And no filter control above a queue with nothing to filter.
    expect(screen.queryByRole('tab', { name: /^Habis/ })).toBeNull();
  });

  it('moves the queue counts after an adjustment made from the queue', async () => {
    render(<App />);

    await screen.findByRole('tab', { name: /^Semua/ });
    await waitFor(() => expect(chipCount('Menipis')).toBeGreaterThan(0));

    const before = chipCount('Menipis');

    /** Narrow to the low-but-sellable rows first. */
    await clickChip('Menipis');

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
      within(dialog)
        .getByRole('button', { name: /simpan perubahan/i })
        .click();
    });

    // The screen refetches because the write invalidated ['dashboard'].
    await waitFor(() => expect(chipCount('Menipis')).toBe(before - 1), { timeout: 4000 });
  });

  it('badges a deactivated product in the queue and withholds its adjust action', async () => {
    const product = getDb().products.find((entry) => !entry.is_active);
    expect(product).toBeDefined();

    const row = getDb().inventory.find((entry) => entry.product_id === product?.id);
    expect(row).toBeDefined();

    render(<App />);
    await screen.findByRole('tab', { name: /^Semua/ });

    const outletName = getDb().outlets.find((outlet) => outlet.id === row?.outlet_id)?.name;
    const queueRow = await screen.findByRole('group', {
      name: `${product?.name} · ${outletName}`,
    });

    // It stays listed: /dashboard/low-stock reports it and the stock is real…
    expect(within(queueRow).getByText('NONAKTIF')).toBeInTheDocument();
    // …but restocking something nobody can sell is not work.
    expect(within(queueRow).queryByRole('button', { name: 'Sesuaikan Stok' })).toBeNull();
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
