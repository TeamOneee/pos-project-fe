/** The 401 signal. */

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
