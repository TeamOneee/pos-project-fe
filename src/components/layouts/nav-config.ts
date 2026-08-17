/**
 * Navigation, declared per role.
 *
 * The shape and wording of the nav are a design decision, so they live in a
 * config object rather than being inferred from permissions. Access stays
 * centralized in the role matrix (shared/permissions).
 */

import {
  Boxes,
  Building2,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { canAccessRoute, type Role } from '@/lib/permissions';

export type NavItem = {
  /** Absolute path, matched against the current route to set the active state. */
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Matches child routes too. `/inventory` would otherwise stay highlighted on
   * `/inventory/low-stock`, which has its own item.
   */
  exact?: boolean;
};

export type NavSection = {
  /** Rendered as a small caption above the group. Cashier has none. */
  title?: string;
  items: NavItem[];
};

const NAV: Record<Role, NavSection[]> = {
  OWNER: [
    {
      title: 'Dashboard',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { href: '/analytics', label: 'Analitik', icon: TrendingUp },
        { href: '/ai-insights', label: 'AI Insight', icon: Sparkles },
      ],
    },
    {
      title: 'Bisnis',
      items: [
        { href: '/outlets', label: 'Outlet', icon: Store },
        { href: '/users', label: 'Staf', icon: Users },
        { href: '/merchant', label: 'Merchant', icon: Building2 },
      ],
    },
    {
      title: 'Katalog',
      items: [
        { href: '/products', label: 'Produk', icon: Package },
        { href: '/categories', label: 'Kategori', icon: Tag },
        // Read-only for the Owner, per the matrix.
        { href: '/inventory', label: 'Stok', icon: Boxes, exact: true },
      ],
    },
    {
      title: 'Riwayat',
      items: [{ href: '/transactions', label: 'Transaksi', icon: ReceiptText }],
    },
  ],

  // No Analitik, no AI Insight and no Riwayat: the matrix closes all three to
  // the Admin, and the stock dashboard is where they land instead.
  ADMIN: [
    {
      title: 'Operasional',
      items: [
        { href: '/dashboard', label: 'Dashboard Stok', icon: LayoutDashboard, exact: true },
        { href: '/inventory', label: 'Inventori', icon: Boxes, exact: true },
        { href: '/inventory/low-stock', label: 'Stok Menipis', icon: TriangleAlert },
      ],
    },
    {
      title: 'Katalog',
      items: [
        { href: '/products', label: 'Produk', icon: Package },
        { href: '/categories', label: 'Kategori', icon: Tag },
      ],
    },
  ],

  // No section titles: two items do not need grouping.
  CASHIER: [
    {
      items: [
        { href: '/pos', label: 'Kasir', icon: ShoppingCart },
        { href: '/transactions', label: 'Riwayat', icon: ReceiptText },
      ],
    },
  ],
};

/** The role's nav, with anything the matrix forbids removed. */
export function navFor(role: Role): NavSection[] {
  return NAV[role]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessRoute(role, item.href)),
    }))
    .filter((section) => section.items.length > 0);
}

/** Flat list, in sidebar order. The bottom tab bar and icon rail use this. */
export function navItemsFor(role: Role): NavItem[] {
  return navFor(role).flatMap((section) => section.items);
}

/**
 * Which item owns the current route.
 *
 * Longest match wins, so `/inventory/low-stock` highlights its own item rather
 * than the `/inventory` one above it.
 */
export function activeHref(items: NavItem[], pathname: string): string | null {
  const matches = items.filter((item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

export { NAV as NAV_CONFIG };
