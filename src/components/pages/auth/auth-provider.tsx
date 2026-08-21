/** Session state for the whole app: who is signed in, in what role, at which outlet. */

import * as React from 'react';

import { useSignOut } from '@/hooks/use-auth';
import { onTokenChange, restoreToken } from '@/api/token';
import { onUnauthorized } from '@/api/unauthorized';
import { decodeToken, isTokenExpired, type TokenClaims } from '@/lib/jwt';
import { emailHint } from '@/lib/token-storage';
import type { Role } from '@/lib/permissions';

export type AuthStatus =
  /** Reading storage. Render nothing yet — it resolves within a tick. */
  'restoring' | 'authenticated' | 'unauthenticated';

export type Session = {
  userId: string;
  merchantId: string;
  role: Role;
  /** The Cashier's outlet. Null for Owner and Admin, who see every outlet. */
  outletId: string | null;
  /** From the login form, not from the API. Empty when the tab was reloaded cold. */
  email: string;
};

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  role: Role | null;
  outletId: string | null;
  /** True once a request has come back 401 on a session that was working. */
  sessionExpired: boolean;
  /** Clears the dead session and returns to the login screen. */
  acknowledgeSessionExpired: () => void;
  signOut: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [restored, setRestored] = React.useState(false);
  const [claims, setClaims] = React.useState<TokenClaims | null>(null);
  const [sessionExpired, setSessionExpired] = React.useState(false);

  const signOutLocally = useSignOut();

  // Boot: pull the token out of storage and read the session straight off it.
  React.useEffect(() => {
    let active = true;

    void restoreToken().then((token) => {
      if (!active) return;
      setClaims(readClaims(token));
      setRestored(true);
    });

    // Login and sign-out both go through setToken, so this keeps the provider in step without
    // either of them having to call into it.
    const unsubscribe = onTokenChange((token) => setClaims(readClaims(token)));

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const session: Session | null = React.useMemo(() => {
    if (!claims) return null;

    return {
      userId: claims.userId,
      merchantId: claims.merchantId,
      role: claims.role,
      outletId: claims.outletId,
      email: emailHint.read() ?? '',
    };
  }, [claims]);

  const status: AuthStatus = !restored
    ? 'restoring'
    : session
      ? 'authenticated'
      : 'unauthenticated';

  // Held in a ref so the 401 listener does not need re-subscribing on every status change, and so
  // it can tell a live session from one that never was.
  const statusRef = React.useRef(status);
  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);

  React.useEffect(
    () =>
      onUnauthorized(() => {
        if (statusRef.current === 'authenticated') setSessionExpired(true);
      }),
    []
  );

  const acknowledgeSessionExpired = React.useCallback(() => {
    setSessionExpired(false);
    // Drop the dead token and every cached query with it; the guard sees an unauthenticated app on
    // the next render and routes to login.
    signOutLocally();
  }, [signOutLocally]);

  const signOut = React.useCallback(() => {
    setSessionExpired(false);
    signOutLocally();
  }, [signOutLocally]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      role: session?.role ?? null,
      outletId: session?.outletId ?? null,
      sessionExpired,
      acknowledgeSessionExpired,
      signOut,
    }),
    [status, session, sessionExpired, acknowledgeSessionExpired, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** A stored token that has already expired is not a session. */
function readClaims(token: string | null): TokenClaims | null {
  const claims = decodeToken(token);
  return claims && !isTokenExpired(claims) ? claims : null;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/**
 * The signed-in session, for screens that already sit behind the guard and so cannot be rendered
 * without one.
 */
export function useCurrentSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error('useCurrentSession used outside an authenticated route');
  return session;
}
