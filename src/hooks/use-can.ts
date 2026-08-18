/**
 * The role matrix, asked at render time.
 *
 * Screens never compare roles. They ask what the signed-in session may do, and
 * the answer comes from lib/permissions — one transcription of the matrix, read
 * by the nav, the route guard, these hooks and the mutation guard alike. Adding
 * a capability to a role is therefore a one-line change in the matrix, and no
 * screen has to be revisited for it.
 */

import { useAuth } from '@/components/pages/auth/auth-provider';
import { can, type Access, type Resource } from '@/lib/permissions';

/** Does the signed-in session hold at least `access` on `resource`? */
export function useCan(resource: Resource, access: Access = 'read'): boolean {
  const { role } = useAuth();
  return role !== null && can(role, resource, access);
}

/** May the signed-in session change the resource, not merely look at it? */
export function useCanManage(resource: Resource): boolean {
  return useCan(resource, 'manage');
}
