/**
 * S-03's period control, which is the one part of the Owner dashboard a user can put into an
 * illegal state.
 */

import '@/api';

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

/** `YYYY-MM-DD`, `offset` days from today — the value a date input carries. */
function day(offset: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The closed dropdown, which reads as whatever the dashboard is showing. */
function trigger(): HTMLElement {
  return screen.getByRole('button', { name: 'Pilih periode' });
}

async function openMenu(): Promise<HTMLElement> {
  // The element is resolved before act() rather than inside it: findByRole polls, and awaiting a
  // polling query within act stalls the effects it is waiting on — the screen never gets past its
  // loading spinner.
  const button = await screen.findByRole('button', { name: 'Pilih periode' });
  await act(async () => {
    fireEvent.click(button);
  });
  return screen.findByRole('menu', { name: 'Pilih periode' });
}

async function openPicker(): Promise<HTMLElement> {
  const menu = await openMenu();
  const item = within(menu).getByRole('menuitemradio', { name: /Pilih Tanggal/ });
  await act(async () => {
    fireEvent.click(item);
  });
  return screen.findByRole('dialog');
}

/** Fills both date fields in one commit, the way the picker is actually used. */
async function draft(dialog: HTMLElement, from: string, to: string) {
  await act(async () => {
    fireEvent.change(within(dialog).getByLabelText('Dari'), { target: { value: from } });
  });
  await act(async () => {
    fireEvent.change(within(dialog).getByLabelText('Sampai'), { target: { value: to } });
  });
}

beforeEach(async () => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');

  resetDb();
  const result = await authApi.login({ email: 'owner@indomart.com', password: 'password123' });
  setToken(result.accessToken);
});

describe('S-03 · the period control', () => {
  it('collapses the whole choice into one closed dropdown', async () => {
    render(<App />);

    // Nothing is on screen but the trigger, which says what is being shown.
    expect(await screen.findByRole('button', { name: 'Pilih periode' })).toHaveTextContent(
      '30 Hari Terakhir'
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('offers three rolling presets and a manual range, and nothing else', async () => {
    render(<App />);

    const menu = await openMenu();

    expect(
      within(menu)
        .getAllByRole('menuitemradio')
        .map((item) => item.textContent)
    ).toEqual(['Hari Ini', '7 Hari Terakhir', '30 Hari Terakhir', 'Pilih Tanggal…']);
  });

  it('ticks the active preset and switches on a pick', async () => {
    render(<App />);

    const menu = await openMenu();
    expect(within(menu).getByRole('menuitemradio', { name: '30 Hari Terakhir' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await act(async () => {
      fireEvent.click(within(menu).getByRole('menuitemradio', { name: '7 Hari Terakhir' }));
    });

    // Choosing closes the menu and the trigger takes up the new label.
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger()).toHaveTextContent('7 Hari Terakhir');
  });

  it('refuses to apply a range wider than the cap, and says why', async () => {
    render(<App />);

    const dialog = await openPicker();
    // Ten days: over the seven-day cap, but a range the API itself would accept, so nothing but
    // this control stands between it and seven queries.
    await draft(dialog, day(-9), day(0));

    expect(within(dialog).getByRole('button', { name: 'Terapkan' })).toBeDisabled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/Rentang maksimal 7 hari/);
  });

  it('rejects a reversed pair', async () => {
    render(<App />);

    const dialog = await openPicker();
    await draft(dialog, day(0), day(-3));

    expect(within(dialog).getByRole('button', { name: 'Terapkan' })).toBeDisabled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Tanggal mulai melebihi tanggal akhir.'
    );
  });

  it('applies a legal range and names it on the trigger', async () => {
    render(<App />);

    const dialog = await openPicker();
    await draft(dialog, day(-6), day(0));

    const apply = within(dialog).getByRole('button', { name: 'Terapkan' });
    expect(apply).toBeEnabled();
    await act(async () => {
      fireEvent.click(apply);
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // The trigger now names the applied range rather than a preset, and reopening the menu shows
    // the custom row ticked instead of any preset.
    expect(trigger()).not.toHaveTextContent('30 Hari Terakhir');

    const menu = await openMenu();
    expect(within(menu).getByRole('menuitemradio', { name: '30 Hari Terakhir' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(within(menu).getAllByRole('menuitemradio')[3]).toHaveAttribute('aria-checked', 'true');
  });

  it('discards the draft on Batal', async () => {
    render(<App />);

    const dialog = await openPicker();
    await draft(dialog, day(-3), day(0));

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger()).toHaveTextContent('30 Hari Terakhir');
  });

  it('closes the menu on Escape without changing anything', async () => {
    render(<App />);

    await openMenu();
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger()).toHaveTextContent('30 Hari Terakhir');
  });
});
