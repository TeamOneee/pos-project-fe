/**
 * Staff lifecycle — contract §1.2. Owner only.
 *
 * Two rules the backend enforces and the forms must mirror (§1.1 rule 2): a
 * CASHIER needs an `outlet_id`, an ADMIN must have none — sending one for an
 * ADMIN is rejected. Both come back as a 400 naming the field.
 *
 * There is no delete and no `GET /staff/:id`. Deactivation is
 * `PATCH /staff/:user_id` with `status: "INACTIVE"`, which also invalidates
 * that account's ability to log in (§1.1).
 */

import { request } from '@/api/client';
import { staffSchema, type Staff } from '@/services/auth';
import { paginated, type Page, type Role, type Status } from '@/api/schema';

export { staffSchema };
export type { Staff };

/** §1.2: filters are role and status only — there is no outlet filter. */
export type StaffFilters = {
  role?: Exclude<Role, 'OWNER'>;
  status?: Status;
  page?: number;
  size?: number;
};

export type CreateStaffInput = {
  name: string;
  email: string;
  password: string;
  /** OWNER is created only through register, never here (§1.1 rule 1). */
  role: Exclude<Role, 'OWNER'>;
  /** Required for CASHIER, forbidden for ADMIN. */
  outlet_id?: string | null;
};

/** §1.2: every field optional, at least one required. `null` clears the outlet. */
export type UpdateStaffInput = {
  role?: Exclude<Role, 'OWNER'>;
  outlet_id?: string | null;
  status?: Status;
  new_password?: string;
};

export const staffApi = {
  list: (filters: StaffFilters = {}): Promise<Page<Staff>> =>
    request({
      method: 'GET',
      path: '/staff',
      query: {
        role: filters.role,
        status: filters.status,
        page: filters.page,
        size: filters.size,
      },
      schema: paginated(staffSchema),
    }),

  /** 409 when the email is taken; 400 when the role/outlet pairing is wrong. */
  create: (input: CreateStaffInput) =>
    request({ method: 'POST', path: '/staff', body: input, schema: staffSchema }),

  /** 403 when the target is another merchant's staff, or the Owner themselves. */
  update: (userId: string, input: UpdateStaffInput) =>
    request({ method: 'PATCH', path: `/staff/${userId}`, body: input, schema: staffSchema }),

  /** Deactivation is an update, not a delete — the account and its history stay. */
  deactivate: (userId: string) =>
    request({
      method: 'PATCH',
      path: `/staff/${userId}`,
      body: { status: 'INACTIVE' },
      schema: staffSchema,
    }),
};
