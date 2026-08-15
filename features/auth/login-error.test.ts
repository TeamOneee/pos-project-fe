/**
 * Login must not leak which field was wrong. This is the test that holds it.
 */

import { presentLoginError } from '@/features/auth/login-error';
import { ApiError } from '@/lib/api/errors';

function apiError(kind: ConstructorParameters<typeof ApiError>[0]['kind'], extra = {}) {
  return new ApiError({ kind, status: 0, message: 'server message', ...extra });
}

describe('a rejected sign-in reveals nothing', () => {
  it('gives the same sentence whatever the server says', () => {
    const unknownEmail = apiError('unauthorized', {
      status: 401,
      message: 'No account for owner@indomart.com',
      details: [{ field: 'email', message: 'Email tidak terdaftar' }],
    });
    const wrongPassword = apiError('unauthorized', {
      status: 401,
      message: 'Password mismatch',
      details: [{ field: 'password', message: 'Password salah' }],
    });

    expect(presentLoginError(unknownEmail).banner).toBe('Email atau password salah.');
    expect(presentLoginError(wrongPassword).banner).toBe(
      presentLoginError(unknownEmail).banner
    );
  });

  it('never repeats the server message, which may name a field', () => {
    const error = apiError('unauthorized', {
      status: 401,
      message: 'Email owner@indomart.com is not registered',
    });

    const { banner } = presentLoginError(error);

    expect(banner).not.toContain('owner@indomart.com');
    expect(banner).not.toMatch(/email tidak|password salah$/i);
  });

  it('marks both fields, so neither is singled out', () => {
    expect(presentLoginError(apiError('unauthorized')).markFieldsInvalid).toBe(true);
  });
});

describe('failures that are not credential failures', () => {
  it('explains a disabled account, which is not a guessing risk', () => {
    const { banner, markFieldsInvalid } = presentLoginError(apiError('forbidden'));

    expect(banner).toBe('Akun Anda dinonaktifkan. Hubungi Owner merchant Anda.');
    // The credentials were right, so the inputs are not at fault.
    expect(markFieldsInvalid).toBe(false);
  });

  it.each(['timeout', 'network'] as const)('tells the user %s is a connection problem', (kind) => {
    expect(presentLoginError(apiError(kind)).banner).toBe(
      'Tidak dapat terhubung ke server. Periksa koneksi Anda.'
    );
  });

  it('falls back to something generic for anything else', () => {
    expect(presentLoginError(apiError('server')).banner).toBe(
      'Terjadi kesalahan. Coba lagi sebentar lagi.'
    );
  });

  it('shows nothing at all when there is no error', () => {
    expect(presentLoginError(null)).toEqual({ banner: null, markFieldsInvalid: false });
    expect(presentLoginError(new Error('boom')).banner).toBeNull();
  });
});
