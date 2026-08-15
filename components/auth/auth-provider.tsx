/**
 * Session state for the whole app: who is signed in, in what role, at which
 * outlet.
 *
 * The token itself lives in lib/api/token.ts, because the transport needs it
 * synchronously on every request. This provider owns everything around it —
 * restoring it on boot, resolving it to a user, and tearing it down when the
 * server says it is no longer good.
 */

import * as React from 'react';

import { useLogout, useSession } from '@/hooks/use-auth';
import type { User } from '@/lib/api/domains/auth';
import { isUnauthorized } from '@/lib/api/errors';
import { clearToken, onTokenChange, restoreToken } from '@/lib/api/token';
import { onUnauthorized } from '@/lib/api/unauthorized';
import type { Role } from '@/lib/auth/permissions';

export type AuthStatus =
  /** Reading storage, or resolving a token to a user. Render nothing yet. */
  | 'restoring'
  | 'authenticated'
  | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  role: Role | null;
  /** The Cashier's outlet. Null for Owner and Admin, who see every outlet. */
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
  const [hasToken, setHasToken] = React.useState(false);
  const [sessionExpired, setSessionExpired] = React.useState(false);

  const logout = useLogout();

  // Boot: pull the token out of secure storage before anything queries.
  React.useEffect(() => {
    let active = true;

    void restoreToken().then((token) => {
      if (!active) return;
      setHasToken(token !== null);
      setRestored(true);
    });

    // Login and logout both go through setToken, so this keeps the provider in
    // step without either of them having to call into it.
    const unsubscribe = onTokenChange((token) => setHasToken(token !== null));

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const session = useSession({ enabled: restored && hasToken });
  const user = session.data ?? null;

  const status: AuthStatus = !restored
    ? 'restoring'
    : !hasToken
      ? 'unauthenticated'
      : user
        ? 'authenticated'
        : session.isError
          ? 'unauthenticated'
          : 'restoring';

  // A token that storage kept but the server rejects is simply not a session.
  // This is the stale-token-on-boot case, and it must not raise the modal.
  React.useEffect(() => {
    if (session.isError && isUnauthorized(session.error)) clearToken();
  }, [session.isError, session.error]);

  // Held in a ref so the 401 listener does not need re-subscribing on every
  // status change, and so it can tell a live session from one that never was.
  // Written in an effect, not during render — the listener only reads it later.
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
    // Drop the dead token and every cached query with it; the guard sees an
    // unauthenticated app on the next render and routes to login.
    logout.mutate();
  }, [logout]);

  const signOut = React.useCallback(() => {
    setSessionExpired(false);
    logout.mutate();
  }, [logout]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role: user?.role ?? null,
      outletId: user?.outletId ?? null,
      sessionExpired,
      acknowledgeSessionExpired,
      signOut,
    }),
    [status, user, sessionExpired, acknowledgeSessionExpired, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/**
 * The signed-in user, for screens that already sit behind the guard and so
 * cannot be rendered without one.
 */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser used outside an authenticated route');
  return user;
}
