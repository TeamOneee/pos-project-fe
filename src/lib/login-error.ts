/** Turning a failed sign-in into one sentence. */

import { isApiError } from '@/api/errors';

export type LoginErrorPresentation = {
  /** Form-level banner copy, or null when there is nothing to show. */
  banner: string | null;
  /** Whether to put both inputs in the error state. Never one of them. */
  markFieldsInvalid: boolean;
};

const GENERIC_CREDENTIALS = 'Email atau password salah.';

export function presentLoginError(error: unknown): LoginErrorPresentation {
  if (!isApiError(error)) return { banner: null, markFieldsInvalid: false };

  switch (error.kind) {
    case 'unauthorized':
      // Both fields, one message, no detail about which was wrong.
      return { banner: GENERIC_CREDENTIALS, markFieldsInvalid: true };

    case 'forbidden':
      // Not a credential failure: the password was right and the account is disabled.
      return {
        banner: 'Akun Anda dinonaktifkan. Hubungi Owner merchant Anda.',
        markFieldsInvalid: false,
      };

    case 'timeout':
    case 'network':
      return {
        banner: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
        markFieldsInvalid: false,
      };

    default:
      return { banner: 'Terjadi kesalahan. Coba lagi sebentar lagi.', markFieldsInvalid: false };
  }
}
