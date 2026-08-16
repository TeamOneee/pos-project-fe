/**
 * The 401 signal.
 *
 * The request pipeline announces here whenever an authenticated request comes
 * back unauthorized; the auth provider listens and raises the expired-session
 * modal. Keeping it a plain module rather than a React import means client.ts
 * has no dependency on the UI layer.
 *
 * A failed sign-in is not an expired session — it is a wrong password — so the
 * auth endpoints are excluded. Without that, one typo at the login screen
 * would raise "Sesi Anda telah berakhir" over the login form.
 */

const EXEMPT_PATHS = ['/auth/login', '/auth/register'];

type Listener = () => void;

const listeners = new Set<Listener>();

export function onUnauthorized(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called by client.ts for every 401 it raises. */
export function reportUnauthorized(path: string): void {
  if (EXEMPT_PATHS.some((exempt) => path.startsWith(exempt))) return;
  listeners.forEach((listener) => listener());
}
