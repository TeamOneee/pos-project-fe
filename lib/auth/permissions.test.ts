/**
 * The role matrix is the thing the router trusts, so it is tested against
 * CLAUDE.md row by row rather than against itself.
 */

import {
  can,
  canAccessRoute,
  canManage,
  dataScope,
  isGuardedRoute,
  landingRoute,
  PERMISSIONS,
  ROLE_LABEL,
  ROLES,
  type Role,
} from '@/lib/auth/permissions';

describe('the matrix matches CLAUDE.md', () => {
  it('gives the Owner the business, read-only on the catalog and stock', () => {
    expect(PERMISSIONS.OWNER).toEqual({
      merchant: 'manage',
      outlets: 'manage',
      staff: 'manage',
      catalog: 'read',
      inventory: 'read',
      businessDashboard: 'read',
      stockDashboard: 'none',
      analytics: 'read',
      aiInsights: 'read',
      transactions: 'read',
      pos: 'none',
    });
  });

  it('gives the Admin operations and nothing else', () => {
    expect(PERMISSIONS.ADMIN).toEqual({
      merchant: 'none',
      outlets: 'none',
      staff: 'none',
      catalog: 'manage',
      inventory: 'manage',
      businessDashboard: 'none',
      stockDashboard: 'read',
      analytics: 'none',
      aiInsights: 'none',
      transactions: 'none',
      pos: 'none',
    });
  });

  it('gives the Cashier the till and their own history', () => {
    expect(PERMISSIONS.CASHIER).toEqual({
      merchant: 'none',
      outlets: 'none',
      staff: 'none',
      catalog: 'none',
      inventory: 'none',
      businessDashboard: 'none',
      stockDashboard: 'none',
      analytics: 'none',
      aiInsights: 'none',
      transactions: 'read',
      pos: 'manage',
    });
  });

  it('keeps checkout away from the Owner and the Admin', () => {
    expect(can('OWNER', 'pos')).toBe(false);
    expect(can('ADMIN', 'pos')).toBe(false);
    expect(canManage('CASHIER', 'pos')).toBe(true);
  });

  it('keeps analytics and AI away from everyone but the Owner', () => {
    expect(can('ADMIN', 'analytics')).toBe(false);
    expect(can('CASHIER', 'analytics')).toBe(false);
    expect(can('ADMIN', 'aiInsights')).toBe(false);
    expect(can('CASHIER', 'aiInsights')).toBe(false);
  });

  it('makes the Owner read-only where the matrix says read-only', () => {
    expect(can('OWNER', 'catalog', 'read')).toBe(true);
    expect(canManage('OWNER', 'catalog')).toBe(false);
    expect(can('OWNER', 'inventory', 'read')).toBe(true);
    expect(canManage('OWNER', 'inventory')).toBe(false);
  });

  it('treats manage as implying read, and none as implying nothing', () => {
    expect(can('ADMIN', 'catalog', 'read')).toBe(true);
    expect(can('ADMIN', 'catalog', 'manage')).toBe(true);
    expect(can('ADMIN', 'staff', 'read')).toBe(false);
  });

  it('confines the Cashier to one outlet', () => {
    expect(dataScope('CASHIER')).toBe('own-outlet');
    expect(dataScope('OWNER')).toBe('all-outlets');
    expect(dataScope('ADMIN')).toBe('all-outlets');
  });
});

describe('route access', () => {
  const ROUTES = [
    '/dashboard',
    '/analytics',
    '/ai-insights',
    '/outlets',
    '/users',
    '/merchant',
    '/products',
    '/categories',
    '/inventory',
    '/inventory/low-stock',
    '/transactions',
    '/transactions/trx_001',
    '/pos',
  ];

  const ALLOWED: Record<Role, string[]> = {
    OWNER: [
      '/dashboard',
      '/analytics',
      '/ai-insights',
      '/outlets',
      '/users',
      '/merchant',
      '/products',
      '/categories',
      '/inventory',
      '/inventory/low-stock',
      '/transactions',
      '/transactions/trx_001',
    ],
    ADMIN: ['/products', '/categories', '/inventory', '/inventory/low-stock'],
    CASHIER: ['/pos', '/transactions', '/transactions/trx_001'],
  };

  it.each(ROLES)('lets %s reach exactly the routes the matrix allows', (role) => {
    const reachable = ROUTES.filter((route) => canAccessRoute(role, route));
    expect(reachable.sort()).toEqual([...ALLOWED[role]].sort());
  });

  it('keeps the Owner reporting routes away from Admin and Cashier', () => {
    expect(canAccessRoute('OWNER', '/dashboard')).toBe(true);
    expect(canAccessRoute('ADMIN', '/dashboard')).toBe(false);
    expect(canAccessRoute('CASHIER', '/dashboard')).toBe(false);
    expect(canAccessRoute('ADMIN', '/analytics')).toBe(false);
  });

  it('closes transactions to the Admin', () => {
    // CLAUDE.md wins over the brief, which lists Transaksi in the Admin nav.
    expect(canAccessRoute('ADMIN', '/transactions')).toBe(false);
    expect(canAccessRoute('ADMIN', '/transactions/trx_001')).toBe(false);
  });

  it('covers child routes and query strings', () => {
    expect(canAccessRoute('ADMIN', '/inventory/low-stock')).toBe(true);
    expect(canAccessRoute('CASHIER', '/inventory/low-stock')).toBe(false);
    expect(canAccessRoute('OWNER', '/products?page=2')).toBe(true);
    expect(canAccessRoute('OWNER', '/products/')).toBe(true);
  });

  it('lets an unknown path through, so a 404 stays a 404', () => {
    expect(canAccessRoute('CASHIER', '/nowhere')).toBe(true);
    expect(isGuardedRoute('/nowhere')).toBe(false);
    expect(isGuardedRoute('/pos')).toBe(true);
  });
});

describe('landing', () => {
  it('sends each role somewhere it is allowed to be', () => {
    ROLES.forEach((role) => {
      expect(canAccessRoute(role, landingRoute(role))).toBe(true);
    });
  });

  it('sends each role to its primary surface', () => {
    expect(landingRoute('OWNER')).toBe('/dashboard');
    expect(landingRoute('ADMIN')).toBe('/inventory');
    expect(landingRoute('CASHIER')).toBe('/pos');
  });

  it('labels roles in Bahasa Indonesia', () => {
    expect(ROLE_LABEL).toEqual({ OWNER: 'Pemilik', ADMIN: 'Admin', CASHIER: 'Kasir' });
  });
});
