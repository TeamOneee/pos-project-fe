/**
 * Route protection.
 *
 * CLAUDE.md rule 3: role gating is enforced here, in the router, not by hiding
 * nav items. Typing a forbidden URL lands on the 403 screen.
 *
 * The decision comes entirely from shared/permissions, so this file has no
 * knowledge of any particular role or route.
 */

import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { ForbiddenScreen } from '@/components/pages/auth/forbidden-screen';
import { canAccessRoute } from '@/lib/permissions';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { status, role } = useAuth();
  const location = useLocation();

  // Still reading storage or resolving the token. Rendering the login screen
  // here would flash it in front of users who are, in fact, signed in.
  if (status === 'restoring') return <AuthSplash />;

  if (status === 'unauthenticated' || !role) return <Navigate to="/login" replace />;

  if (!canAccessRoute(role, location.pathname)) return <ForbiddenScreen role={role} />;

  return <>{children}</>;
}

/**
 * Guards the public routes in the other direction: someone already signed in
 * has no use for the login screen.
 */
export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === 'restoring') return <AuthSplash />;
  if (status === 'authenticated') return <Navigate to="/" replace />;

  return <>{children}</>;
}

function AuthSplash() {
  return (
    <div className="flex h-full items-center justify-center bg-canvas">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
    </div>
  );
}
