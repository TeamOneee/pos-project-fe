/** Auth mutations, and the session derived from the token. */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authApi, type LoginInput, type RegisterInput } from '@/services/auth';
import { clearToken, setToken } from '@/api/token';
import { emailHint } from '@/lib/token-storage';

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (result, variables) => {
      // The email is kept only so the account chip has something truthful to show; the role and
      // outlet come from the token's own claims.
      emailHint.write(variables.email);
      setToken(result.accessToken);
    },
  });
}

/** Register. */
export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
  });
}

/** Sign out. */
export function useSignOut() {
  const queryClient = useQueryClient();

  return () => {
    clearToken();
    emailHint.clear();
    queryClient.clear();
  };
}
