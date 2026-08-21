/** A mutation that the role matrix has to authorise before it can be sent. */

import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { ApiError } from '@/api/errors';
import { can, type Access, type Resource } from '@/lib/permissions';

export type Requirement = { resource: Resource; access: Access };

/** The 403 the client raises on its own, before any request is made. */
export function forbiddenByRole(requirement: Requirement): ApiError {
  return new ApiError({
    kind: 'forbidden',
    status: 403,
    message: 'Peran Anda tidak memiliki izin untuk mengubah data ini.',
    details: [{ field: requirement.resource, message: `Requires ${requirement.access}` }],
  });
}

export function useGuardedMutation<TVariables, TData, TContext = unknown>(
  requirement: Requirement,
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
    onMutate?: (variables: TVariables) => Promise<TContext> | TContext;
    onError?: (error: unknown, variables: TVariables, context: TContext | undefined) => void;
    onSettled?: (
      data: TData | undefined,
      error: unknown,
      variables: TVariables,
      context: TContext | undefined
    ) => void;
  }
): UseMutationResult<TData, unknown, TVariables, TContext> {
  const { role } = useAuth();
  const allowed = role !== null && can(role, requirement.resource, requirement.access);

  return useMutation<TData, unknown, TVariables, TContext>({
    mutationFn: (variables) => {
      if (!allowed) return Promise.reject(forbiddenByRole(requirement));
      return options.mutationFn(variables);
    },
    ...(options.onSuccess ? { onSuccess: options.onSuccess } : {}),
    ...(options.onMutate ? { onMutate: options.onMutate } : {}),
    ...(options.onError ? { onError: options.onError } : {}),
    ...(options.onSettled ? { onSettled: options.onSettled } : {}),
  });
}
