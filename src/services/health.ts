/** Platform health endpoint — contract §8.2. No UI consumes this operational read. */

import { z } from 'zod';

import { request } from '@/api/client';

export const healthSchema = z
  .object({
    status: z.literal('ok'),
    database: z.literal('ok'),
    worker_backlog: z.object({ ai_job_pending: z.number() }),
  })
  .transform((value) => ({
    status: value.status,
    database: value.database,
    workerBacklog: { aiJobPending: value.worker_backlog.ai_job_pending },
  }));

export type Health = z.infer<typeof healthSchema>;

export const healthApi = {
  get: () => request({ method: 'GET', path: '/health', schema: healthSchema }),
};
