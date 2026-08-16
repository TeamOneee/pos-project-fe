/**
 * The application shell: sidebar at desktop, icon rail at tablet, footer tabs
 * at mobile.
 *
 * These are three different trees rather than one tree with responsive classes,
 * because the navigation genuinely changes shape — a 248px labelled sidebar and
 * a five-item tab bar do not share a layout.
 *
 * The cashier POS is chromeless at every breakpoint.
 */

import { useLocation } from 'react-router-dom';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { FooterTabs } from '@/components/layouts/footer-tabs';
import { Header } from '@/components/layouts/header';
import { IconRail } from '@/components/layouts/icon-rail';
import { activeHref, navFor } from '@/components/layouts/nav-config';
import { useTopBarActionsValue, useTopBarTitleOverride } from '@/components/layouts/shell-context';
import { Sidebar } from '@/components/layouts/sidebar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useMerchant } from '@/hooks/use-merchant';
import { can, type Role } from '@/lib/permissions';

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

  // Only the Owner may read the merchant, so only the Owner's sidebar can show
  // its name. Everyone else falls back to the product wordmark.
  const merchant = useMerchant({ enabled: role !== null && can(role, 'merchant') });

  if (!role) return null;

  if (isChromeless(location.pathname)) {
    return <div className="h-full bg-canvas">{children}</div>;
  }

  const title = titleOverride ?? navTitleFor(role, location.pathname);
  const merchantName = merchant.data?.name ?? null;

  return (
    <div className="flex h-full flex-col bg-canvas">
      <Header title={title} actions={topBarActions} />
      <div className="flex min-h-0 flex-1">
        {breakpoint === 'desktop' ? (
          <Sidebar role={role} pathname={location.pathname} merchantName={merchantName} />
        ) : breakpoint === 'tablet' ? (
          <IconRail role={role} pathname={location.pathname} />
        ) : null}

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
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
