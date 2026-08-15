/**
 * Where the session token is kept, per platform.
 *
 * **Native** uses expo-secure-store, which is the iOS keychain and Android
 * EncryptedSharedPreferences. The token is encrypted at rest and scoped to the
 * app.
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
 * token at all. `webStorage` below is the only place that would change.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEY = 'pos.auth.token';

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
  },
};

const nativeStorage: TokenStorage = {
  read: () => SecureStore.getItemAsync(STORAGE_KEY),
  write: (token) => SecureStore.setItemAsync(STORAGE_KEY, token),
  clear: () => SecureStore.deleteItemAsync(STORAGE_KEY),
};

export const tokenStorage: TokenStorage = Platform.OS === 'web' ? webStorage : nativeStorage;
