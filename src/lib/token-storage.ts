/**
 * Where the session token is kept, per platform.
 *
 * **Web** is the honest part. A true httpOnly cookie cannot be created from
 * JavaScript — only a `Set-Cookie` header from the server can, and the backend
 * does not issue one today. So this is the closest equivalent available to a
 * client:
 *
 *   • `sessionStorage`, not `localStorage` — the token dies with the tab and is
 *     never shared with other tabs or windows.
 *   • Reads go through the in-memory copy, so ordinary app code touches storage
 *     once per session rather than on every request.
 *
 * That still leaves the token readable by any script running on the origin,
 * which is exactly what httpOnly is for. Closing that gap needs the backend to
 * set an httpOnly, Secure, SameSite=Strict cookie on `POST /auth/login` and to
 * accept it on subsequent requests; the client would then stop handling the
 * token at all.
 */

const STORAGE_KEY = 'pos.auth.token';
const EMAIL_KEY = 'pos.auth.email';

type TokenStorage = {
  read: () => Promise<string | null>;
  write: (token: string) => Promise<void>;
  clear: () => Promise<void>;
};

/** Available under static rendering, where there is no window at all. */
function sessionStorageOrNull(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    // Storage can throw outright when cookies are blocked.
    return null;
  }
}

const webStorage: TokenStorage = {
  read: async () => sessionStorageOrNull()?.getItem(STORAGE_KEY) ?? null,
  write: async (token) => {
    sessionStorageOrNull()?.setItem(STORAGE_KEY, token);
  },
  clear: async () => {
    sessionStorageOrNull()?.removeItem(STORAGE_KEY);
    sessionStorageOrNull()?.removeItem(EMAIL_KEY);
  },
};

export const tokenStorage: TokenStorage = webStorage;

/**
 * The signed-in email, kept beside the token.
 *
 * Contract §1.2 returns no user object from login and offers no `GET /auth/me`,
 * so **no endpoint in this API can tell the client who is signed in by name**.
 * The JWT claims carry `sub`, `merchant_id`, `role` and `outlet_id` — an id, not
 * a person.
 *
 * The email is the one identifying thing the client legitimately holds: the
 * user typed it into the login form. Persisting it here is what lets the account
 * chip say something truthful after a reload. It is a local echo of user input,
 * never treated as authoritative, and it is cleared with the token.
 *
 * A display name would need the backend to add either a `name` claim or a
 * profile endpoint.
 */
export const emailHint = {
  read: (): string | null => sessionStorageOrNull()?.getItem(EMAIL_KEY) ?? null,
  write: (email: string): void => {
    sessionStorageOrNull()?.setItem(EMAIL_KEY, email);
  },
  clear: (): void => {
    sessionStorageOrNull()?.removeItem(EMAIL_KEY);
  },
};
