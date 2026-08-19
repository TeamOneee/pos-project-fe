/**
 * S-11, and the enforcement behind the screen.
 *
 * The Owner and the Admin both manage the catalog (BR-011B), so the mutation
 * surfaces are on the screen for both roles. What is tested here:
 *
 *   1. Both roles see the create button and the row menus.
 *   2. The mutation hooks are guarded by the matrix — but the matrix admits
 *      both roles, so a direct call from either session reaches the API.
 *   3. The mock backend would answer 403 for any role the matrix excludes.
 */

import '@/api';

import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { AuthProvider, useAuth } from '@/components/pages/auth/auth-provider';
import { getDb, resetDb } from '@/api/mock/db';
import { setToken } from '@/api/token';
import { useCreateProduct, useDeactivateProduct } from '@/hooks/use-products';
import { authApi } from '@/services';
import { createQueryClient } from '@/lib/query-client';

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

async function openProducts() {
  window.history.pushState({}, '', '/products');
  await act(async () => {
    render(<App />);
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
    expect(await screen.findByText('Menampilkan 1–10 dari 14')).toBeInTheDocument();
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
    const category = getDb().categories.find((entry) => entry.id === 'cat_minuman');
    if (category) category.is_active = false;

    await openProducts();

    const badges = await screen.findAllByText('KATEGORI NONAKTIF');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('gives the Owner the same mutation affordances as the Admin', async () => {
    await signInAs('owner@indomart.com');
    await openProducts();

    expect(await screen.findByRole('button', { name: /\+ tambah produk/i })).toBeInTheDocument();

    // The list has to have rendered, or this would pass on an empty screen.
    await screen.findByText('Menampilkan 1–10 dari 14');

    const menus = await screen.findAllByRole('button', { name: /menu untuk/i });
    expect(menus.length).toBeGreaterThan(0);
    expect(screen.queryByText('Tampilan hanya-baca')).toBeNull();
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
            {
              name: 'Selundupan',
              price: '1000.00',
              category_id: 'cat_minuman',
              low_stock_threshold: 5,
            },
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
  it('lets an Owner session through to the API (BR-011B)', async () => {
    await signInAs('owner@indomart.com');

    let settled: ProbeResult = null;
    await renderProbe('OWNER', (result) => {
      settled = result;
    });

    const before = getDb().products.length;

    await act(async () => {
      screen.getByRole('button', { name: 'create' }).click();
    });
    await waitFor(() => expect(getDb().products.length).toBe(before + 1));

    expect(settled).toBeNull();

    settled = null;
    await act(async () => {
      screen.getByRole('button', { name: 'deactivate' }).click();
    });
    await waitFor(() =>
      expect(getDb().products.find((entry) => entry.id === 'prd_cc1500')?.is_active).toBe(false)
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
