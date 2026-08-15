/**
 * The application shell: sidebar at desktop, icon rail at tablet, bottom tabs
 * at mobile.
 *
 * These are three different trees rather than one tree with responsive classes,
 * because the navigation genuinely changes shape — a 248px labelled sidebar and
 * a five-item tab bar do not share a layout.
 *
 * The cashier POS is chromeless at every breakpoint. It is the one screen the
 * product is built around, it needs the whole viewport, and it carries its own
 * top bar (design brief S-16).
 */

import { usePathname } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth/auth-provider';
import { BottomTabs } from '@/components/shell/bottom-tabs';
import { IconRail } from '@/components/shell/icon-rail';
import { activeHref, navFor } from '@/components/shell/nav-config';
import { useTopBarTitleOverride } from '@/components/shell/shell-context';
import { Sidebar } from '@/components/shell/sidebar';
import { TopBar } from '@/components/shell/top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useMerchant } from '@/hooks/use-merchant';
import { can, type Role } from '@/lib/auth/permissions';

/** Routes that render without any shell chrome, at every breakpoint. */
const CHROMELESS = ['/pos'];

function isChromeless(pathname: string): boolean {
  return CHROMELESS.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const breakpoint = useBreakpoint();
  const pathname = usePathname();
  const titleOverride = useTopBarTitleOverride();

  // Only the Owner may read the merchant, so only the Owner's sidebar can show
  // its name. Everyone else falls back to the product wordmark.
  const merchant = useMerchant({ enabled: role !== null && can(role, 'merchant') });

  if (!role) return null;

  if (isChromeless(pathname)) {
    return <View className="flex-1 bg-canvas">{children}</View>;
  }

  const title = titleOverride ?? navTitleFor(role, pathname);
  const merchantName = merchant.data?.name ?? null;

  if (breakpoint === 'mobile') {
    return (
      <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
        <TopBar title={title} />
        <View className="flex-1">{children}</View>
        <BottomTabs role={role} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 flex-row bg-canvas" edges={['top', 'bottom']}>
      {breakpoint === 'desktop' ? (
        <Sidebar role={role} pathname={pathname} merchantName={merchantName} />
      ) : (
        <IconRail role={role} pathname={pathname} />
      )}

      <View className="min-w-0 flex-1">
        <TopBar title={title} />
        <View className="flex-1">{children}</View>
      </View>
    </SafeAreaView>
  );
}

/** The active nav item's label, which is the right title for most screens. */
function navTitleFor(role: Role, pathname: string): string {
  const items = navFor(role).flatMap((section) => section.items);
  const href = activeHref(items, pathname);
  return items.find((item) => item.href === href)?.label ?? '';
}
