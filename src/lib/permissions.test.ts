/**
 * The role matrix, every role against every route.
 *
 * Written as an explicit table rather than a loop over the implementation,
 * because a test that derives its expectations from the code it is testing proves
 * only that the code is self-consistent. The table below is transcribed from
 * CLAUDE.md § Role matrix and § Routes; if the implementation drifts from the
 * product decision, this fails.
 *
 * The three lines from the rules that are easiest to get wrong, and are asserted
 * here directly:
 *   • The Owner never manages the catalog — read-only on products and inventory.
 *   • The Admin has *no access* to transactions, analytics or AI insight.
 *   • Neither Owner nor Admin can reach the POS.
 */

import { describe, expect, it } from 'vitest';

import {
  can,
  canAccessRoute,
  canManage,
  dataScope,
  isGuardedRoute,
  landingRoute,
  PERMISSIONS,
  ROLES,
  type Resource,
  type Role,
} from '@/lib/permissions';

/** Every route the app serves behind the guard, with who may open it. */
const ROUTE_ACCESS: Record<string, Role[]> = {
  '/dashboard': ['OWNER', 'ADMIN'],
  '/analytics': ['OWNER'],
  '/ai-insights': ['OWNER'],
  '/outlets': ['OWNER'],
  '/users': ['OWNER'],
  '/merchant': ['OWNER'],
  '/products': ['OWNER', 'ADMIN'],
  '/categories': ['OWNER', 'ADMIN'],
  '/inventory': ['OWNER', 'ADMIN'],
  '/inventory/low-stock': ['OWNER', 'ADMIN'],
  '/transactions': ['OWNER', 'CASHIER'],
  '/transactions/trx_001': ['OWNER', 'CASHIER'],
  '/pos': ['CASHIER'],
};

/** The capability table from CLAUDE.md, transcribed. */
const CAPABILITIES: Record<Resource, Record<Role, 'none' | 'read' | 'manage'>> = {
  merchant: { OWNER: 'manage', ADMIN: 'none', CASHIER: 'none' },
  outlets: { OWNER: 'manage', ADMIN: 'none', CASHIER: 'none' },
  staff: { OWNER: 'manage', ADMIN: 'none', CASHIER: 'none' },
  catalog: { OWNER: 'read', ADMIN: 'manage', CASHIER: 'none' },
  inventory: { OWNER: 'read', ADMIN: 'manage', CASHIER: 'none' },
  businessDashboard: { OWNER: 'read', ADMIN: 'none', CASHIER: 'none' },
  stockDashboard: { OWNER: 'none', ADMIN: 'read', CASHIER: 'none' },
  analytics: { OWNER: 'read', ADMIN: 'none', CASHIER: 'none' },
  aiInsights: { OWNER: 'read', ADMIN: 'none', CASHIER: 'none' },
  transactions: { OWNER: 'read', ADMIN: 'none', CASHIER: 'read' },
  pos: { OWNER: 'none', ADMIN: 'none', CASHIER: 'manage' },
};

describe('every role against every route', () => {
  const pairs = Object.entries(ROUTE_ACCESS).flatMap(([route, allowed]) =>
    ROLES.map((role) => ({ route, role, allowed: allowed.includes(role) }))
  );

  it.each(pairs)('$role on $route → $allowed', ({ route, role, allowed }) => {
    expect(canAccessRoute(role, route)).toBe(allowed);
  });

  it('covers every guarded route in the app', () => {
    // A route added to the guard without a row above would slip through untested.
    for (const route of Object.keys(ROUTE_ACCESS)) {
      expect(isGuardedRoute(route), `${route} is not guarded`).toBe(true);
    }
  });

  it('ignores a trailing slash and a query string', () => {
    expect(canAccessRoute('ADMIN', '/analytics/')).toBe(false);
    expect(canAccessRoute('ADMIN', '/analytics?period=TODAY')).toBe(false);
    expect(canAccessRoute('OWNER', '/analytics/')).toBe(true);
  });

  it('lets an unrecognised path through rather than answering 403 for a 404', () => {
    expect(canAccessRoute('CASHIER', '/nonsense')).toBe(true);
    expect(isGuardedRoute('/nonsense')).toBe(false);
  });
});

describe('every role against every capability', () => {
  const pairs = (Object.keys(CAPABILITIES) as Resource[]).flatMap((resource) =>
    ROLES.map((role) => ({ resource, role, expected: CAPABILITIES[resource][role] }))
  );

  it.each(pairs)('$role on $resource → $expected', ({ resource, role, expected }) => {
    expect(PERMISSIONS[role][resource]).toBe(expected);

    // `manage` implies `read`; `read` implies neither `manage` nor nothing.
    expect(can(role, resource, 'read')).toBe(expected !== 'none');
    expect(canManage(role, resource)).toBe(expected === 'manage');
  });
});

describe('the rules that are easiest to break', () => {
  it('keeps the Owner read-only on the catalog and on stock', () => {
    for (const resource of ['catalog', 'inventory'] as const) {
      expect(can('OWNER', resource, 'read')).toBe(true);
      expect(canManage('OWNER', resource)).toBe(false);
    }
  });

  it('closes transactions, analytics and AI insight to the Admin entirely', () => {
    for (const resource of ['transactions', 'analytics', 'aiInsights'] as const) {
      expect(can('ADMIN', resource, 'read')).toBe(false);
    }
    expect(canAccessRoute('ADMIN', '/transactions')).toBe(false);
    expect(canAccessRoute('ADMIN', '/transactions/trx_001')).toBe(false);
    expect(canAccessRoute('ADMIN', '/analytics')).toBe(false);
    expect(canAccessRoute('ADMIN', '/ai-insights')).toBe(false);
  });

  it('keeps checkout to the Cashier', () => {
    expect(canManage('CASHIER', 'pos')).toBe(true);
    expect(canAccessRoute('OWNER', '/pos')).toBe(false);
    expect(canAccessRoute('ADMIN', '/pos')).toBe(false);
  });

  it('gives the two dashboards to different roles behind one path', () => {
    expect(can('OWNER', 'businessDashboard')).toBe(true);
    expect(can('OWNER', 'stockDashboard')).toBe(false);
    expect(can('ADMIN', 'stockDashboard')).toBe(true);
    expect(can('ADMIN', 'businessDashboard')).toBe(false);
    // Both reach /dashboard; the screen resolves which surface to render.
    expect(canAccessRoute('OWNER', '/dashboard')).toBe(true);
    expect(canAccessRoute('ADMIN', '/dashboard')).toBe(true);
    expect(canAccessRoute('CASHIER', '/dashboard')).toBe(false);
  });

  it('confines only the Cashier to one outlet', () => {
    expect(dataScope('CASHIER')).toBe('own-outlet');
    expect(dataScope('OWNER')).toBe('all-outlets');
    expect(dataScope('ADMIN')).toBe('all-outlets');
  });

  it('lands each role somewhere it may actually go', () => {
    for (const role of ROLES) {
      expect(canAccessRoute(role, landingRoute(role)), `${role} cannot open its landing`).toBe(
        true
      );
    }
    expect(landingRoute('CASHIER')).toBe('/pos');
  });
});
