/**
 * The application shell: sidebar at desktop, icon rail at tablet, footer tabs
 * at mobile.
 *
 * These are three different trees rather than one tree with responsive classes,
 * because the navigation genuinely changes shape — a 248px labelled sidebar and
 * a five-item tab bar do not share a layout.
 *
 * The cashier POS is chromeless at every breakpoint. The one exception: an
 * Owner stepping into the till on mobile keeps the bottom tab bar, so there is
 * a visible way back to the Owner's other screens — the till is a detour for
 * them, not their workstation.
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
import { UserChip } from '@/components/layouts/user-chip';
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

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const mainRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  if (!role) return null;

  if (isChromeless(location.pathname)) {
    // The Owner's till keeps the mobile tab bar so they can step back out of
    // it; a Cashier's stays fully chromeless — it is their workstation.
    if (role === 'OWNER') {
      const desktop = breakpoint === 'desktop';
      return (
        <div className="flex h-full flex-col bg-canvas">
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
    return <div className="h-full bg-canvas">{children}</div>;
  }

  const title = titleOverride ?? navTitleFor(role, location.pathname);
  const desktop = breakpoint === 'desktop';

  return (
    <div className="flex h-full flex-col bg-canvas">
      <Header
        title={title}
        actions={
          <>
            {topBarActions}
            {breakpoint === 'mobile' && <UserChip compact placement="below" align="end" />}
          </>
        }
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={desktop ? () => setSidebarCollapsed(!sidebarCollapsed) : undefined}
      />
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
