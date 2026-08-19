/**
 * Staff. Owner only, for both reading and writing (§1.2).
 *
 * There is no single-staff endpoint, so a screen that needs one row takes it
 * from the list it already has.
 */

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import { useGuardedMutation, type Requirement } from '@/hooks/use-guarded-mutation';
import {
  staffApi,
  type CreateStaffInput,
  type StaffFilters,
  type UpdateStaffInput,
} from '@/services/staff';
import { queryKeys } from '@/lib/query-client';

const MANAGE_STAFF: Requirement = { resource: 'staff', access: 'manage' };

export function useStaff(filters: StaffFilters = {}) {
  return useQuery({
    queryKey: queryKeys.staff(filters),
    queryFn: () => staffApi.list(filters),
    // A roster changes rarely, and every staff write invalidates the list.
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

function useStaffInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.staff() });
  };
}

/** 409 when the email is taken; 400 when the role/outlet pairing is wrong. */
export function useCreateStaff() {
  const invalidate = useStaffInvalidation();

  return useGuardedMutation(MANAGE_STAFF, {
    mutationFn: (input: CreateStaffInput) => staffApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateStaff() {
  const invalidate = useStaffInvalidation();

  return useGuardedMutation(MANAGE_STAFF, {
    mutationFn: ({ userId, input }: { userId: string; input: UpdateStaffInput }) =>
      staffApi.update(userId, input),
    onSuccess: invalidate,
  });
}

/**
 * Deactivation, which §1.1 makes stronger than it sounds: an INACTIVE account
 * cannot log in and cannot check out, and any token it already holds stops
 * working on the next request.
 */
export function useDeactivateStaff() {
  const invalidate = useStaffInvalidation();

  return useGuardedMutation(MANAGE_STAFF, {
    mutationFn: (userId: string) => staffApi.deactivate(userId),
    onSuccess: invalidate,
  });
}
