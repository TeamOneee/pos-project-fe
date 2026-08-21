/** S-05 · AI Insight, against contract §7. */

import '@/api';

import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App';
import { clearInsights, getDb, resetDb } from '@/api/mock/db';
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

async function openInsights() {
  window.history.pushState({}, '', '/ai-insights');
  await act(async () => {
    render(<App />);
  });
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');
});

describe('S-05 · AI insight', () => {
  it('renders the latest results per type, with contract labels', async () => {
    await signInAsOwner();
    await openInsights();

    expect(
      await screen.findByText('Penjualan naik 18% dibanding periode sebelumnya')
    ).toBeInTheDocument();
    expect(screen.getByText('Kopi Susu Botol menyumbang omzet terbesar')).toBeInTheDocument();
    expect(screen.getByText('Jam sibuk terjadi sore hari')).toBeInTheDocument();

    // Type badges read in Bahasa, from the contract's five types.
    expect(screen.getByText('Tren Penjualan')).toBeInTheDocument();
    expect(screen.getByText('Produk Terlaris')).toBeInTheDocument();
    expect(screen.getByText('Pola Waktu')).toBeInTheDocument();

    // The seeded job's timestamp, and each card's "Diperbarui" footer.
    expect(screen.getByText('Analisis terakhir: 12 Agu 2026, 15.02')).toBeInTheDocument();
    expect(screen.getAllByText('Diperbarui 12 Agu 2026, 15.02').length).toBe(3);
  });

  it('answers 404 as an empty state, not an error', async () => {
    await signInAsOwner();
    clearInsights();
    await openInsights();

    expect(await screen.findByText('Belum ada insight')).toBeInTheDocument();
    expect(
      screen.getByText('Jalankan analisis pertama Anda untuk melihat rekomendasi bisnis.')
    ).toBeInTheDocument();
    // The trigger stays available — that is the CTA of this state.
    expect(screen.getByRole('button', { name: 'Analisis dengan AI' })).toBeInTheDocument();
  });

  it('flips to the processing state when an analysis is queued', async () => {
    await signInAsOwner();
    await openInsights();

    const trigger = await screen.findByRole('button', { name: 'Analisis dengan AI' });
    await act(async () => {
      trigger.click();
    });

    // The job is now PENDING for today, so the polling state takes over.
    expect(await screen.findByText('Sedang menganalisis…')).toBeInTheDocument();
    expect(screen.getByText(/Hasil akan muncul dalam beberapa saat/)).toBeInTheDocument();

    // The trigger is disabled with the promised label.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Menganalisis…' })).toBeDisabled()
    );

    // The queue landed in the store §7.1 rule 2 dedupes on: one job for today.
    expect(getDb().analysisJob?.state).toBe('PENDING');
  });

  it('copies an insight to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await signInAsOwner();
    await openInsights();

    const copy = (await screen.findAllByRole('button', { name: 'Salin' }))[0] as HTMLElement;
    await act(async () => {
      copy.click();
    });

    expect(await screen.findByText('Insight disalin')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('Penjualan naik 18% dibanding periode sebelumnya')
    );
  });

  it('refuses an Admin with the 403 screen', async () => {
    resetDb();
    const result = await authApi.login({ email: 'sari@indomart.com', password: 'password123' });
    setToken(result.accessToken);
    await openInsights();

    expect(await screen.findByText('Akses ditolak')).toBeInTheDocument();
  });
});
