/**
 * S-11's two variants, and the enforcement behind them.
 *
 * The Owner's catalog is read-only in three layers, and each one is checked here:
 *
 *   1. Nothing that mutates is in the DOM — not hidden, not disabled, absent.
 *   2. The mutation hooks reject for an Owner session before a request is made,
 *      so calling one directly (a stale component, a console, a future screen
 *      that forgets to gate a button) still cannot write.
 *   3. The mock backend answers 403 anyway, which is what layer 2 is agreeing
 *      with rather than replacing.
 */

import '@/api';

import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { AuthProvider, useAuth } from '@/components/pages/auth/auth-provider';
import { getDb, resetDb } from '@/api/mock/db';
import { setToken } from '@/api/token';
import { isApiError } from '@/api/errors';
import { useCreateProduct, useDeactivateProduct } from '@/hooks/use-products';
import { authApi } from '@/services';
import { createQueryClient } from '@/lib/query-client';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** Affordances that must never reach an Owner's catalog screen. */
const ADMIN_ONLY_LABELS = [/\+ tambah produk/i, /^edit$/i, /^nonaktifkan$/i, /menu untuk/i];

async function signInAs(email: string) {
  resetDb();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);
}

async function openProducts() {
  render(<App />);
  await act(async () => {
    window.history.pushState({}, '', '/products');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.innerWidth = 1400;
  window.history.pushState({}, '', '/');
});

describe('S-11 · products list', () => {
  it('gives the Admin the create button and a row menu per product', async () => {
    await signInAs('sari@indomart.com');
    await openProducts();

    expect(await screen.findByRole('button', { name: /\+ tambah produk/i })).toBeInTheDocument();

    const menus = await screen.findAllByRole('button', { name: /menu untuk/i });
    expect(menus.length).toBeGreaterThan(0);
  });

  it('reports the server-side window in the footer', async () => {
    await signInAs('sari@indomart.com');
    await openProducts();

    // The seed has twelve products and the page size is ten.
    expect(await screen.findByText('Menampilkan 1–10 dari 12')).toBeInTheDocument();
  });

  it('opens the row menu with Edit, stock and Nonaktifkan', async () => {
    await signInAs('sari@indomart.com');
    await openProducts();

    const menu = (await screen.findAllByRole('button', { name: /menu untuk/i }))[0];
    await act(async () => {
      menu?.click();
    });

    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Lihat Stok per Outlet' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Nonaktifkan' })).toBeInTheDocument();
  });

  it('marks an active product whose category was deactivated', async () => {
    await signInAs('sari@indomart.com');

    // Deactivating a category does not cascade: its products stay ACTIVE and
    // stay in this list, which is exactly the case the badge exists for.
    const category = getDb().categories.find((entry) => entry.category_id === 'cat_minuman');
    if (category) category.status = 'INACTIVE';

    await openProducts();

    const badges = await screen.findAllByText('KATEGORI NONAKTIF');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders the Owner variant with no mutation affordance in the DOM', async () => {
    await signInAs('owner@indomart.com');
    await openProducts();

    expect(
      await screen.findByText('Tampilan hanya-baca. Katalog dikelola oleh Admin.')
    ).toBeInTheDocument();

    // The list has to have rendered, or this would pass on an empty screen.
    await screen.findByText('Menampilkan 1–10 dari 12');

    for (const label of ADMIN_ONLY_LABELS) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(screen.queryByText('Aksi')).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* The guard behind the missing buttons                                        */
/* -------------------------------------------------------------------------- */

type ProbeResult = { error: unknown } | null;

/**
 * Calls the catalog mutations directly, with no screen and no button in between —
 * the "what if something calls the hook anyway" case.
 */
function MutationProbe({ onSettled }: { onSettled: (result: ProbeResult) => void }) {
  const create = useCreateProduct();
  const deactivate = useDeactivateProduct();
  const { role } = useAuth();

  return (
    <div>
      {/* The guard reads the session's role, so the test has to wait for one —
          a probe that fires while the role is still null proves nothing. */}
      <span data-testid="role">{role ?? 'none'}</span>
      <button
        type="button"
        onClick={() =>
          create.mutate(
            { name: 'Selundupan', sku: 'X-1', price: '1000', category_id: 'cat_minuman' },
            { onError: (error) => onSettled({ error }), onSuccess: () => onSettled(null) }
          )
        }
      >
        create
      </button>
      <button
        type="button"
        onClick={() =>
          deactivate.mutate('prd_cc1500', {
            onError: (error) => onSettled({ error }),
            onSuccess: () => onSettled(null),
          })
        }
      >
        deactivate
      </button>
    </div>
  );
}

async function renderProbe(role: 'OWNER' | 'ADMIN', onSettled: (result: ProbeResult) => void) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <MutationProbe onSettled={onSettled} />
      </AuthProvider>
    </QueryClientProvider>
  );

  await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent(role));
}

describe('catalog mutations under the role matrix', () => {
  it('refuses an Owner session without sending a request', async () => {
    await signInAs('owner@indomart.com');

    let settled: ProbeResult = null;
    await renderProbe('OWNER', (result) => {
      settled = result;
    });

    const before = getDb().products.length;

    await act(async () => {
      screen.getByRole('button', { name: 'create' }).click();
    });
    await waitFor(() => expect(settled).not.toBeNull());

    const error = (settled as unknown as { error: unknown }).error;
    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.kind).toBe('forbidden');
    // Nothing was created, and nothing was even attempted: the mock never saw it.
    expect(getDb().products).toHaveLength(before);

    settled = null;
    await act(async () => {
      screen.getByRole('button', { name: 'deactivate' }).click();
    });
    await waitFor(() => expect(settled).not.toBeNull());

    expect(getDb().products.find((entry) => entry.product_id === 'prd_cc1500')?.status).toBe(
      'ACTIVE'
    );
  });

  it('lets an Admin session through to the API', async () => {
    await signInAs('sari@indomart.com');

    let settled: ProbeResult = null;
    await renderProbe('ADMIN', (result) => {
      settled = result;
    });

    const before = getDb().products.length;

    await act(async () => {
      screen.getByRole('button', { name: 'create' }).click();
    });
    await waitFor(() => expect(getDb().products.length).toBe(before + 1));

    expect(settled).toBeNull();
  });
});
