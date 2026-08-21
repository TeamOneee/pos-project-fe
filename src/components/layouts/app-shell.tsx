/** The application shell: sidebar at desktop, icon rail at tablet, footer tabs at mobile. */

import * as React from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { FooterTabs } from '@/components/layouts/footer-tabs';
import { Header } from '@/components/layouts/header';
import { IconRail } from '@/components/layouts/icon-rail';
import { activeHref, navFor } from '@/components/layouts/nav-config';
import {
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

  // §2.2 opens `GET /merchant` to every role, so every sidebar can carry the merchant name — it is
  // no longer an Owner-only fact.
  const merchant = useMerchant();
  const merchantName = merchant.data?.name ?? null;

  // The shell survives navigation (it is a layout route), so `<main>` keeps its scroll unless reset
  // here — the sidebar, by contrast, deliberately keeps its position.
  const mainRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  if (!role) return null;

  const chromeless = isChromeless(location.pathname);
  const desktop = breakpoint === 'desktop';
  const title = titleOverride ?? navTitleFor(role, location.pathname);

  // The till supplies its own bar — outlet, clock, its own actions — so the app header would be a
  // second one stacked on it.
  const showHeader = !chromeless && breakpoint !== 'mobile';

  // The Cashier's mobile till stays full-screen: the cart needs the height, and the till is their
  // workstation.
  const showTabs = breakpoint === 'mobile' && (!chromeless || role === 'OWNER');

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="flex min-h-0 flex-1">
        {desktop && !sidebarCollapsed ? (
          <Sidebar role={role} pathname={location.pathname} merchantName={merchantName} />
        ) : breakpoint === 'tablet' ? (
          <IconRail role={role} pathname={location.pathname} />
        ) : null}

        {/* The header sits beside the navigation rather than above it, so the
            rail runs the full height of the window and the merchant name is the
            top-left corner on every screen. */}
        <div className="flex min-w-0 flex-1 flex-col">
          {showHeader && <Header title={title} actions={topBarActions} />}

          <main ref={mainRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {showTabs ? <FooterTabs role={role} pathname={location.pathname} /> : null}
    </div>
  );
}

/** The active nav item's label, which is the right title for most screens. */
function navTitleFor(role: Role, pathname: string): string {
  const items = navFor(role).flatMap((section) => section.items);
  const href = activeHref(items, pathname);
  return items.find((item) => item.href === href)?.label ?? '';
}
