/**
 * The application shell: sidebar at desktop, icon rail at tablet, footer tabs
 * at mobile.
 *
 * These are three different trees rather than one tree with responsive classes,
 * because the navigation genuinely changes shape — a 248px labelled sidebar and
 * a five-item tab bar do not share a layout.
 *
 * The till at /pos drops the app header — it carries its own bar, with the
 * outlet, the clock and the till's own actions — but keeps the navigation
 * beside it, so a Cashier does not watch a sidebar appear out of nowhere the
 * moment they open Riwayat.
 *
 * Mobile is the exception, and only for a Cashier: the till needs the height
 * for its cart, and the till is their workstation rather than a screen they
 * pass through. An Owner stepping into it on mobile keeps the tab bar, because
 * for them the till is a detour and they need the way back out.
 *
 * The desktop sidebar collapses to give a screen (the dashboard, say) the full
 * width. The state lives in the shell context so it survives navigation; the
 * header toggle brings it back.
 */

import * as React from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { FooterTabs } from '@/components/layouts/footer-tabs';
import { Header } from '@/components/layouts/header';
import { IconRail } from '@/components/layouts/icon-rail';
import { activeHref, navFor } from '@/components/layouts/nav-config';
import {
  useSetSidebarCollapsed,
  useSidebarCollapsed,
  useTopBarActionsValue,
  useTopBarTitleOverride,
} from '@/components/layouts/shell-context';
import { Sidebar } from '@/components/layouts/sidebar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useMerchant } from '@/hooks/use-merchant';
import type { Role } from '@/lib/permissions';

/** Routes that render without any shell chrome, at every breakpoint. */
const CHROMELESS = ['/pos'];

function isChromeless(pathname: string): boolean {
  return CHROMELESS.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const breakpoint = useBreakpoint();
  const location = useLocation();
  const titleOverride = useTopBarTitleOverride();
  const topBarActions = useTopBarActionsValue();
  const sidebarCollapsed = useSidebarCollapsed();
  const setSidebarCollapsed = useSetSidebarCollapsed();

  // §2.2 opens `GET /merchant` to every role, so every sidebar can carry the
  // merchant name — it is no longer an Owner-only fact.
  const merchant = useMerchant();
  const merchantName = merchant.data?.name ?? null;

  // The shell survives navigation (it is a layout route), so `<main>` keeps its
  // scroll unless reset here — the sidebar, by contrast, deliberately keeps its
  // position. Only the panel resets; the side rail does not.
  const mainRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  if (!role) return null;

  if (isChromeless(location.pathname)) {
    return (
      <div className="flex h-full flex-col bg-canvas">
        <div className="flex min-h-0 flex-1">
          {breakpoint === 'desktop' && !sidebarCollapsed ? (
            <Sidebar role={role} pathname={location.pathname} merchantName={merchantName} />
          ) : breakpoint === 'tablet' ? (
            <IconRail role={role} pathname={location.pathname} />
          ) : null}

          <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        {breakpoint === 'mobile' && role === 'OWNER' ? (
          <FooterTabs role={role} pathname={location.pathname} />
        ) : null}
      </div>
    );
  }

  const title = titleOverride ?? navTitleFor(role, location.pathname);
  const desktop = breakpoint === 'desktop';

  return (
    <div className="flex h-full flex-col bg-canvas">
      {breakpoint !== 'mobile' && (
        <Header
          title={title}
          actions={topBarActions}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={desktop ? () => setSidebarCollapsed(!sidebarCollapsed) : undefined}
        />
      )}
      <div className="flex min-h-0 flex-1">
        {desktop && !sidebarCollapsed ? (
          <Sidebar role={role} pathname={location.pathname} merchantName={merchantName} />
        ) : breakpoint === 'tablet' ? (
          <IconRail role={role} pathname={location.pathname} />
        ) : null}

        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      {breakpoint === 'mobile' ? <FooterTabs role={role} pathname={location.pathname} /> : null}
    </div>
  );
}

/** The active nav item's label, which is the right title for most screens. */
function navTitleFor(role: Role, pathname: string): string {
  const items = navFor(role).flatMap((section) => section.items);
  const href = activeHref(items, pathname);
  return items.find((item) => item.href === href)?.label ?? '';
}
