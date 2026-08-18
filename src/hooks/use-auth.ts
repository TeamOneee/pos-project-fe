/**
 * Auth mutations, and the session derived from the token.
 *
 * Contract §1.2 is unusually spare here, and it shapes this whole file:
 *
 *   • There is no `GET /auth/me`, so the session is **decoded from the JWT**
 *     rather than fetched. `useSession` is therefore not a query at all.
 *   • There is no `POST /auth/logout` and no server-side revocation, so signing
 *     out is purely local — drop the token, clear the cache.
 *   • There is no `POST /auth/refresh`. A 900-second token simply expires and
 *     the user signs in again.
 *
 * The token lives in api/token.ts, not in the query cache — the transport needs
 * it synchronously on every request.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authApi, type LoginInput, type RegisterInput } from '@/services/auth';
import { clearToken, setToken } from '@/api/token';
import { emailHint } from '@/lib/token-storage';

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (result, variables) => {
      // The email is kept only so the account chip has something truthful to
      // show; the role and outlet come from the token's own claims.
      emailHint.write(variables.email);
      setToken(result.accessToken);
    },
  });
}

/**
 * Register.
 *
 * §1.2 returns no token here — creating a merchant does not sign the owner in.
 * The screen sends them to the login form afterwards.
 */
export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
  });
}

/**
 * Sign out.
 *
 * Local only, and deliberately so: §1.2 states there is no logout endpoint and
 * no blacklist, so a token that has already been copied stays valid until it
 * expires. Clearing the query cache matters more than usual because of that —
 * one user's data must not survive into the next session on this tab.
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return () => {
    clearToken();
    emailHint.clear();
    queryClient.clear();
  };
}
