/**
 * The role matrix, typed.
 *
 * CLAUDE.md § Role matrix is authoritative, and this file is its only
 * transcription. The sidebar config and the route guard both read from here —
 * nothing else in the app decides what a role may do, and no screen carries a
 * `role === 'OWNER'` conditional to gate a route.
 *
 * CLAUDE.md wins over the older design brief wherever they disagreed, as it
 * says it does. One place that matters:
 *
 *   • The brief's Admin sidebar listed RIWAYAT → Transaksi, and S-21 said
 *     "Access: all roles". The matrix gives Admin **no access** to
 *     transactions, so Admin has no Transaksi nav item and a 403 on the route.
 *
 * The Owner inherits every Admin capability (BR-011B): the API opens catalog
 * and inventory mutations to `ADMIN` and `OWNER` alike, so both manage those
 * resources here — there is no read-only Owner variant anywhere.
 *
 * One deliberate departure from that brief: the Owner **can** open the POS.
 * §4.2 lets an Owner pick any active outlet in the merchant and run the till
 * there ("Owner boleh memilih satu Outlet aktif dalam Merchant saat membuka
 * POS"), so `pos` is `manage` for the Owner, not `none`. The brief's sidebar
 * never listed the till for the Owner; the product decision is that a small
 * merchant owner is also a cashier when the till needs them.
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
    // BR-011B: the Owner inherits the Admin's catalog and inventory rights.
    catalog: 'manage',
    inventory: 'manage',
    businessDashboard: 'read',
    stockDashboard: 'none',
    analytics: 'read',
    aiInsights: 'read',
    transactions: 'read',
    // §4.2: an Owner works a till at any active outlet of their choosing.
    pos: 'manage',
  },
  ADMIN: {
    merchant: 'none',
    // §2.2 opens `GET /outlets` to the Admin, and it has to: every stock screen
    // is scoped per outlet and cannot render a picker without the list. Reading
    // is not managing — the `/outlets` route below asks for `manage`.
    outlets: 'read',
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
 *
 * `/dashboard` is the one path two roles share while showing different
 * screens: the Owner's business dashboard (S-03) and the Admin's operational
 * stock dashboard (S-14). The rule below admits either capability and the
 * screen picks which surface to render. `/analytics` and `/ai-insights` stay
 * Owner-only, so an Admin typing those URLs gets a real 403.
 */
type Requirement = { resource: Resource; access: Access };

type RouteRule = { pattern: RegExp; anyOf: Requirement[] };

const ROUTE_RULES: RouteRule[] = [
  {
    pattern: /^\/dashboard$/,
    anyOf: [
      { resource: 'businessDashboard', access: 'read' },
      { resource: 'stockDashboard', access: 'read' },
    ],
  },
  { pattern: /^\/analytics/, anyOf: [{ resource: 'analytics', access: 'read' }] },
  { pattern: /^\/ai-insights/, anyOf: [{ resource: 'aiInsights', access: 'read' }] },
  // `manage`, not `read`: an Admin may read the outlet list for a filter but
  // has no business on the outlet-management screen (§2.2 makes writes OWNER).
  { pattern: /^\/outlets/, anyOf: [{ resource: 'outlets', access: 'manage' }] },
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
 * to. The Owner lands on business reporting, the Admin on the stock dashboard —
 * both live at `/dashboard`, which resolves per role.
 */
export const LANDING_ROUTE: Record<Role, string> = {
  OWNER: '/dashboard',
  ADMIN: '/dashboard',
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
