/** Staff. Owner only — creating an Admin is the Owner's route to a catalog. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  usersApi,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFilters,
} from '@/services/users';
import { queryKeys } from '@/lib/query-client';

/** Owner-only endpoint, so callers that may run as another role pass `enabled`. */
export function useUsers(filters: UserFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.users(filters),
    queryFn: () => usersApi.list(filters),
    enabled: options.enabled ?? true,
  });
}

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.user(userId ?? ''),
    queryFn: () => usersApi.get(userId ?? ''),
    enabled: Boolean(userId),
  });
}

function useUserInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

/** 409 when the email is taken; 400 when role and outlet disagree. */
export function useCreateUser() {
  const invalidate = useUserInvalidation();

  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useUserInvalidation();

  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateUserInput }) =>
      usersApi.update(userId, input),
    onSuccess: invalidate,
  });
}

export function useDeactivateUser() {
  const invalidate = useUserInvalidation();

  return useMutation({
    mutationFn: (userId: string) => usersApi.deactivate(userId),
    onSuccess: invalidate,
  });
}
