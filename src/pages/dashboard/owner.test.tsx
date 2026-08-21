/**
 * S-03's period control, which is the one part of the Owner dashboard a user
 * can put into an illegal state.
 *
 * The rule under test is not "the range is capped" — `period.test.ts` covers
 * the arithmetic. It is that an over-wide range cannot be *applied*: the cap
 * has to stop it at the dialog, because once a range is committed it fans out
 * to seven queries, and one of them (`useTransactions`) has no way to be told
 * not to run.
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

async function openPicker(): Promise<HTMLElement> {
  const chip = await screen.findByRole('tab', { name: 'Pilih Tanggal' });
  await act(async () => {
    fireEvent.click(chip);
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
  it('offers three rolling presets and a manual range, and nothing else', async () => {
    render(<App />);

    const tabs = await screen.findByRole('tablist', { name: 'Pilih periode' });

    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent)
    ).toEqual(['Hari Ini', '7 Hari Terakhir', '30 Hari Terakhir', 'Pilih Tanggal']);
  });

  it('starts on the widest preset', async () => {
    render(<App />);

    expect(await screen.findByRole('tab', { name: '30 Hari Terakhir' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('refuses to apply a range wider than the cap, and says why', async () => {
    render(<App />);

    const dialog = await openPicker();
    // Ten days: over the seven-day cap, but a range the API itself would accept,
    // so nothing but this control stands between it and seven queries.
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

  it('applies a legal range and names it on the chip', async () => {
    render(<App />);

    const dialog = await openPicker();
    await draft(dialog, day(-6), day(0));

    const apply = within(dialog).getByRole('button', { name: 'Terapkan' });
    expect(apply).toBeEnabled();
    await act(async () => {
      fireEvent.click(apply);
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // The chip now names the applied range rather than prompting, and no preset
    // is selected — the dashboard is showing something none of them mean.
    expect(screen.queryByRole('tab', { name: 'Pilih Tanggal' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '30 Hari Terakhir' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('discards the draft on Batal', async () => {
    render(<App />);

    const dialog = await openPicker();
    await draft(dialog, day(-3), day(0));

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: '30 Hari Terakhir' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
