/**
 * The nav is a design decision; the matrix is the gate. These tests hold the
 * seam between them — chiefly that no nav item can ever point somewhere its
 * role would be shown a 403.
 */

import { activeHref, navFor, navItemsFor } from '@/components/shell/nav-config';
import { canAccessRoute, ROLES } from '@/lib/auth/permissions';

describe('the nav never contradicts the matrix', () => {
  it.each(ROLES)('gives %s only routes it can open', (role) => {
    const items = navItemsFor(role);

    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(canAccessRoute(role, item.href)).toBe(true);
    });
  });

  it.each(ROLES)('gives %s no duplicate destinations', (role) => {
    const hrefs = navItemsFor(role).map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('per-role shape', () => {
  it('groups the Owner nav into four sections', () => {
    const sections = navFor('OWNER');

    expect(sections.map((section) => section.title)).toEqual([
      'Dashboard',
      'Bisnis',
      'Katalog',
      'Riwayat',
    ]);
    expect(navItemsFor('OWNER').map((item) => item.href)).toEqual([
      '/dashboard',
      '/analytics',
      '/ai-insights',
      '/outlets',
      '/users',
      '/merchant',
      '/products',
      '/categories',
      '/inventory',
      '/transactions',
    ]);
  });

  it('gives the Admin operations and catalog, and no transactions', () => {
    const hrefs = navItemsFor('ADMIN').map((item) => item.href);

    expect(hrefs).toEqual([
      '/dashboard',
      '/inventory',
      '/inventory/low-stock',
      '/products',
      '/categories',
    ]);
    expect(hrefs).not.toContain('/transactions');
  });

  it('gives the Cashier two items and no section headings', () => {
    const sections = navFor('CASHIER');

    expect(sections).toHaveLength(1);
    expect(sections[0]?.title).toBeUndefined();
    expect(navItemsFor('CASHIER').map((item) => item.href)).toEqual(['/pos', '/transactions']);
  });

  it('names the same route differently for Owner and Admin', () => {
    const owner = navItemsFor('OWNER').find((item) => item.href === '/dashboard');
    const admin = navItemsFor('ADMIN').find((item) => item.href === '/dashboard');

    expect(owner?.label).toBe('Dashboard');
    expect(admin?.label).toBe('Dashboard Stok');
  });

  it('keeps the Admin within five items, so the tab bar needs no overflow', () => {
    expect(navItemsFor('ADMIN').length).toBeLessThanOrEqual(5);
    expect(navItemsFor('CASHIER').length).toBeLessThanOrEqual(5);
    // The Owner exceeds it, which is what the "Lainnya" tab is for.
    expect(navItemsFor('OWNER').length).toBeGreaterThan(5);
  });
});

describe('active item', () => {
  it('prefers the longest match, so a child route wins', () => {
    const items = navItemsFor('ADMIN');

    expect(activeHref(items, '/inventory/low-stock')).toBe('/inventory/low-stock');
    expect(activeHref(items, '/inventory')).toBe('/inventory');
  });

  it('keeps a detail route attached to its list item', () => {
    const items = navItemsFor('CASHIER');
    expect(activeHref(items, '/transactions/trx_001')).toBe('/transactions');
  });

  it('does not treat an exact item as a prefix', () => {
    const items = navItemsFor('OWNER');
    // /dashboard is exact, so nothing nested under it should light it up.
    expect(activeHref(items, '/dashboard/anything')).toBeNull();
  });

  it('returns null off-nav', () => {
    expect(activeHref(navItemsFor('OWNER'), '/nowhere')).toBeNull();
  });
});
