/**
 * A mutation that the role matrix has to authorise before it can be sent.
 *
 * Hiding a button is a UI decision; this is the enforcement. A mutation hook
 * declares the capability it needs once, and a session without that capability
 * gets a rejected promise instead of an HTTP request — so there is no reachable
 * write even for code that calls the hook directly, and no accidental 403 round
 * trip from a screen that forgot to gate an affordance.
 *
 * The backend gates the same endpoints; this is the client agreeing with it
 * rather than relying on it. The error is deliberately shaped like the server's
 * 403 (`kind: 'forbidden'`) so error handling downstream has one case to answer.
 */

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
  });
}
