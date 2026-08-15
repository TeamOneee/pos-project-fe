/**
 * Route protection.
 *
 * CLAUDE.md rule 3: role gating is enforced here, in the router, not by hiding
 * nav items. Typing a forbidden URL lands on the 403 screen; it never renders a
 * screen the role cannot have and never leaves a half-loaded page behind a
 * failing request.
 *
 * The decision comes entirely from lib/auth/permissions.ts, so this file has no
 * knowledge of any particular role or route.
 */

import { Redirect, usePathname } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { ForbiddenScreen } from '@/components/auth/forbidden-screen';
import { canAccessRoute } from '@/lib/auth/permissions';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { status, role } = useAuth();
  const pathname = usePathname();

  // Still reading storage or resolving the token. Rendering the login screen
  // here would flash it in front of users who are, in fact, signed in.
  if (status === 'restoring') return <AuthSplash />;

  if (status === 'unauthenticated' || !role) return <Redirect href="/login" />;

  if (!canAccessRoute(role, pathname)) return <ForbiddenScreen role={role} />;

  return <>{children}</>;
}

/**
 * Guards the public routes in the other direction: someone already signed in
 * has no use for the login screen.
 */
export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === 'restoring') return <AuthSplash />;
  if (status === 'authenticated') return <Redirect href="/" />;

  return <>{children}</>;
}

function AuthSplash() {
  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <ActivityIndicator />
    </View>
  );
}
