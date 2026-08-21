/** Where the session token is kept, per platform. */

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

/** The signed-in email, kept beside the token. */
export const emailHint = {
  read: (): string | null => sessionStorageOrNull()?.getItem(EMAIL_KEY) ?? null,
  write: (email: string): void => {
    sessionStorageOrNull()?.setItem(EMAIL_KEY, email);
  },
  clear: (): void => {
    sessionStorageOrNull()?.removeItem(EMAIL_KEY);
  },
};
