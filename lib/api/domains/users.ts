/**
 * User module — contract §4.4. Owner only.
 *
 * Two rules the backend enforces and the forms must mirror: a CASHIER needs an
 * outlet_id, an ADMIN must have none. Both come back as a 400 with a message
 * naming the field.
 */

import { z } from 'zod';

import { request } from '@/lib/api/client';
import { userSchema, type User } from '@/lib/api/domains/auth';
import { noData, type Role, type Status } from '@/lib/api/schema';

export { userSchema };
export type { User };

export type UserFilters = { role?: Role; outlet_id?: string; status?: Status };

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  /** OWNER is created only through register, never here. */
  role: Exclude<Role, 'OWNER'>;
  /** Required for CASHIER, must be null for ADMIN. */
  outlet_id?: string | null;
  status?: Status;
};

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>> & { password?: string };

export const usersApi = {
  list: (filters: UserFilters = {}) =>
    request({
      method: 'GET',
      path: '/users',
      query: { role: filters.role, outlet_id: filters.outlet_id, status: filters.status },
      schema: z.array(userSchema),
    }),

  get: (userId: string) =>
    request({ method: 'GET', path: `/users/${userId}`, schema: userSchema }),

  /** 409 when the email is taken; 400 when the role/outlet pairing is wrong. */
  create: (input: CreateUserInput) =>
    request({ method: 'POST', path: '/users', body: input, schema: userSchema }),

  update: (userId: string, input: UpdateUserInput) =>
    request({ method: 'PUT', path: `/users/${userId}`, body: input, schema: userSchema }),

  deactivate: (userId: string) =>
    request({ method: 'DELETE', path: `/users/${userId}`, schema: noData }),
};
