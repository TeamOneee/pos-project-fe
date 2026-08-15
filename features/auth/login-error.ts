/**
 * Turning a failed sign-in into one sentence.
 *
 * The rule this file exists to hold: a 401 says "Email atau password salah."
 * and nothing more specific, whether the email is unknown or the password is
 * wrong. Distinguishing them would let anyone enumerate which emails have
 * accounts on a merchant.
 *
 * The API cooperates — it answers 401 for both — but it can also return an
 * `errors[]` array, and this deliberately ignores it for the credential case.
 */

import { isApiError } from '@/lib/api/errors';

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
      // Not a credential failure: the password was right and the account is
      // disabled. Saying so tells the user what to do about it.
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
