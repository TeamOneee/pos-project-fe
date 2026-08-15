/**
 * The role matrix, typed.
 *
 * CLAUDE.md § Role matrix is authoritative, and this file is its only
 * transcription. The sidebar config and the route guard both read from here —
 * nothing else in the app decides what a role may do, and no screen carries a
 * `role === 'OWNER'` conditional to gate a route.
 *
 * Where CLAUDE.md and docs/design-brief.md disagree, CLAUDE.md wins, as it
 * says it does. Two places that matters:
 *
 *   • The brief's Admin sidebar lists RIWAYAT → Transaksi, and S-21 says
 *     "Access: all roles". The matrix gives Admin **no access** to
 *     transactions, so Admin has no Transaksi nav item and a 403 on the route.
 *   • The brief (§9.7) has the Owner managing the catalog, following the API
 *     contract. The matrix makes the Owner read-only there, which is the
 *     reading the brief itself offers as the alternative.
 */

export const ROLES = ['OWNER', 'ADMIN', 'CASHIER'] as const;

export type Role = (typeof ROLES)[number];

/**
 * The capabilities a role can hold. One entry per row of the matrix.
 *
 * `catalog` and `inventory` are modelled as screen access. The matrix notes
 * that a Cashier reads products "via POS only" and stock "at own outlet" —
 * both of those needs are served by the `pos` capability and the POS screen's
 * own queries, not by a catalog or inventory screen. Giving the Cashier `read`
 * here would put Produk and Inventori in their sidebar, which the product does
 * not have.
 */
export type Resource =
  | 'merchant'
  | 'outlets'
  | 'staff'
  | 'catalog'
  | 'inventory'
  | 'businessDashboard'
  | 'stockDashboard'
  | 'analytics'
  | 'aiInsights'
  | 'transactions'
  | 'pos';

/** Ordered: `manage` implies `read`, `read` implies nothing. */
export type Access = 'none' | 'read' | 'manage';

const ACCESS_RANK: Record<Access, number> = { none: 0, read: 1, manage: 2 };

export const PERMISSIONS: Record<Role, Record<Resource, Access>> = {
  OWNER: {
    merchant: 'manage',
    outlets: 'manage',
    staff: 'manage',
    // Read-only: the Owner's route to a catalog is to create an Admin.
    catalog: 'read',
    inventory: 'read',
    businessDashboard: 'read',
    stockDashboard: 'none',
    analytics: 'read',
    aiInsights: 'read',
    transactions: 'read',
    pos: 'none',
  },
  ADMIN: {
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
  },
  CASHIER: {
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
  },
};

/** Does this role hold at least `access` on `resource`? */
export function can(role: Role, resource: Resource, access: Access = 'read'): boolean {
  return ACCESS_RANK[PERMISSIONS[role][resource]] >= ACCESS_RANK[access];
}

/** True when the role may change the resource, not merely look at it. */
export function canManage(role: Role, resource: Resource): boolean {
  return can(role, resource, 'manage');
}

/**
 * How much of the merchant a role sees. A Cashier is confined to the outlet
 * they are assigned to; everyone else sees every outlet.
 */
export type DataScope = 'all-outlets' | 'own-outlet';

export function dataScope(role: Role): DataScope {
  return role === 'CASHIER' ? 'own-outlet' : 'all-outlets';
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A route is reachable when the role satisfies any one of its requirements.
 * `/dashboard` and `/analytics` are Owner reporting surfaces. The Admin lands
 * on inventory operations, so typing either reporting URL returns a real 403.
 */
type Requirement = { resource: Resource; access: Access };

type RouteRule = { pattern: RegExp; anyOf: Requirement[] };

const ROUTE_RULES: RouteRule[] = [
  {
    pattern: /^\/dashboard$/,
    anyOf: [{ resource: 'businessDashboard', access: 'read' }],
  },
  { pattern: /^\/analytics/, anyOf: [{ resource: 'analytics', access: 'read' }] },
  { pattern: /^\/ai-insights/, anyOf: [{ resource: 'aiInsights', access: 'read' }] },
  { pattern: /^\/outlets/, anyOf: [{ resource: 'outlets', access: 'read' }] },
  { pattern: /^\/users/, anyOf: [{ resource: 'staff', access: 'read' }] },
  { pattern: /^\/merchant/, anyOf: [{ resource: 'merchant', access: 'read' }] },
  { pattern: /^\/products/, anyOf: [{ resource: 'catalog', access: 'read' }] },
  { pattern: /^\/categories/, anyOf: [{ resource: 'catalog', access: 'read' }] },
  { pattern: /^\/inventory/, anyOf: [{ resource: 'inventory', access: 'read' }] },
  { pattern: /^\/transactions/, anyOf: [{ resource: 'transactions', access: 'read' }] },
  { pattern: /^\/pos/, anyOf: [{ resource: 'pos', access: 'manage' }] },
];

/**
 * May this role open this path?
 *
 * An unrecognised path is allowed through — a 404 is Expo Router's business,
 * and answering 403 for a route that does not exist would be a lie.
 */
export function canAccessRoute(role: Role, pathname: string): boolean {
  const path = normalisePath(pathname);
  const rule = ROUTE_RULES.find((entry) => entry.pattern.test(path));
  if (!rule) return true;

  return rule.anyOf.some((requirement) => can(role, requirement.resource, requirement.access));
}

/** True when a rule exists for the path, so the guard knows it is a real route. */
export function isGuardedRoute(pathname: string): boolean {
  const path = normalisePath(pathname);
  return ROUTE_RULES.some((entry) => entry.pattern.test(path));
}

function normalisePath(pathname: string): string {
  const withoutQuery = pathname.split('?')[0] ?? '';
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) return withoutQuery.slice(0, -1);
  return withoutQuery || '/';
}

/* -------------------------------------------------------------------------- */
/* Landing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Where a role goes after signing in, and where the 403 screen sends them back
 * to. The Owner lands on business reporting, the Admin on inventory operations.
 */
export const LANDING_ROUTE: Record<Role, string> = {
  OWNER: '/dashboard',
  ADMIN: '/inventory',
  CASHIER: '/pos',
};

export function landingRoute(role: Role): string {
  return LANDING_ROUTE[role];
}

/** Role name as it appears on screen. UI copy is Bahasa Indonesia. */
export const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Pemilik',
  ADMIN: 'Admin',
  CASHIER: 'Kasir',
};
