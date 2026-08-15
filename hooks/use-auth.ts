/**
 * Auth queries and mutations.
 *
 * The token lives in lib/api/token.ts, not in query cache — the transport needs
 * it synchronously. These hooks keep the two in step and clear every cached
 * query on the way out, so one user's data can never surface under another.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authApi, type LoginInput, type RegisterInput } from '@/lib/api/domains/auth';
import { isUnauthorized } from '@/lib/api/errors';
import { clearToken, getToken, setToken } from '@/lib/api/token';
import { queryKeys } from '@/lib/query-client';

/** The signed-in user. Disabled until a token exists, so it never 401s on boot. */
export function useSession(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => authApi.me(),
    enabled: options.enabled ?? getToken() !== null,
    // A session that has gone stale should surface as signed-out, not as a retry loop.
    retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 1,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (result) => {
      setToken(result.accessToken);
      queryClient.setQueryData(queryKeys.session, result.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (result) => {
      setToken(result.accessToken);
      queryClient.setQueryData(queryKeys.session, result.user);
      queryClient.setQueryData(queryKeys.merchant, result.merchant);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    // Clear locally either way: a failed logout call must not strand the user
    // in a session they have already left.
    onSettled: () => {
      clearToken();
      queryClient.clear();
    },
  });
}
