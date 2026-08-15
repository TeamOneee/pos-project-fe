/**
 * Merchant module — contract §4.2. Owner only.
 *
 * One merchant per account; there is no list endpoint.
 */

import { request } from '@/lib/api/client';
import { merchantSchema, type Merchant } from '@/lib/api/domains/auth';

export type { Merchant };

export type UpdateMerchantInput = {
  name?: string;
  /** Applies to every outlet — there is no per-outlet threshold. */
  low_stock_threshold?: number;
};

export const merchantsApi = {
  get: () => request({ method: 'GET', path: '/merchants', schema: merchantSchema }),

  update: (input: UpdateMerchantInput) =>
    request({ method: 'PUT', path: '/merchants', body: input, schema: merchantSchema }),
};
