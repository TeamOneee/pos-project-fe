/**
 * Bearer token holder.
 *
 * Kept deliberately small and framework-free: the transport needs the token
 * synchronously on every request, and the auth screens are not built yet. The
 * session store, when it lands, drives this rather than replacing it.
 */

import { tokenStorage } from '@/lib/token-storage';

let current: string | null = null;

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

/** Synchronous read, for the request path. */
export function getToken(): string | null {
  return current;
}

export function setToken(token: string | null): void {
  current = token;
  listeners.forEach((listener) => listener(token));

  // Persistence is fire-and-forget: a failed write must not fail the login that
  // triggered it, and the in-memory value is already correct.
  const write = token === null ? tokenStorage.clear() : tokenStorage.write(token);
  void write.catch(() => {
    // Storage unavailable; the session simply will not survive a restart.
  });
}

export function clearToken(): void {
  setToken(null);
}

/** Rehydrate on boot. Returns the token so callers can branch on it. */
export async function restoreToken(): Promise<string | null> {
  try {
    const stored = await tokenStorage.read();
    current = stored;
    listeners.forEach((listener) => listener(stored));
    return stored;
  } catch {
    return null;
  }
}

/** Notifies on every change, so the router can react to a 401-driven logout. */
export function onTokenChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
