/** Insight (BI) module — contract §7.2. Owner only, for both trigger and read. */

import { z } from 'zod';

import { request, requestWithStatus } from '@/api/client';
import {
  analysisJobStatusSchema,
  id,
  insightStatusSchema,
  insightTypeSchema,
  isoDateTime,
} from '@/api/schema';

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/* -------------------------------------------------------------------------- */

const analysisJobSchema = z
  .object({
    id,
    status: analysisJobStatusSchema.optional(),
    state: analysisJobStatusSchema.optional(),
    analysis_date: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), 'Format tanggal tidak valid'),
    updated_at: isoDateTime,
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (!value.status && !value.state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'status/state required',
        path: ['status'],
      });
    }
  })
  .transform((value) => ({
    jobId: value.id,
    status: (value.status ?? value.state)!,
    /**
     * Local calendar date in the merchant's timezone; the dedupe key. Normalizes datetime to
     * YYYY-MM-DD.
     */
    analysisDate: value.analysis_date.includes('T')
      ? value.analysis_date.slice(0, 10)
      : value.analysis_date,
    updatedAt: value.updated_at,
  }));

export type AnalysisJob = z.infer<typeof analysisJobSchema>;

/** §7.4 `InsightResult`. */
const insightSchema = z
  .object({
    id,
    type: insightTypeSchema,
    status: insightStatusSchema,
    title: z.string(),
    content: z.string(),
    evidence_summary: z.record(z.unknown()),
    period_start: isoDateTime,
    period_end: isoDateTime,
    generated_at: isoDateTime,
  })
  .passthrough()
  .transform((value) => ({
    insightId: value.id,
    type: value.type,
    status: value.status,
    title: value.title,
    content: value.content,
    evidenceSummary: value.evidence_summary,
    periodStart: value.period_start,
    periodEnd: value.period_end,
    generatedAt: value.generated_at,
  }));

export type Insight = z.infer<typeof insightSchema>;

const insightsResponseSchema = z
  .object({
    analysis_job: analysisJobSchema,
    insights: z.array(insightSchema),
  })
  .transform((value) => ({
    analysisJob: value.analysis_job,
    /** Latest result per type. There is no history — OD-007. */
    insights: value.insights,
  }));

export type InsightsResponse = z.infer<typeof insightsResponseSchema>;

const triggerResultSchema = z
  .object({
    job_id: id,
    status: analysisJobStatusSchema.optional(),
    state: analysisJobStatusSchema.optional(),
  })
  .passthrough()
  .transform((value) => ({ jobId: value.job_id, status: (value.status ?? value.state)! }));

export type TriggerResult = z.infer<typeof triggerResultSchema> & {
  /** True when this call created the day's job (202) rather than finding it (200). */
  isNewJob: boolean;
};

/* -------------------------------------------------------------------------- */
/* Client                                                                      */
/* -------------------------------------------------------------------------- */

export const insightsApi = {
  /** 404 until the merchant has triggered its first analysis. */
  get: () => request({ method: 'GET', path: '/insights', schema: insightsResponseSchema }),

  /**
   * Queue today's analysis. Takes no body — §7.2 fixes the window at the 30 local days ending on
   * the trigger date.
   */
  trigger: async (): Promise<TriggerResult> => {
    const result = await requestWithStatus({
      method: 'POST',
      path: '/insights/trigger',
      schema: triggerResultSchema,
    });

    return { ...result.data, isNewJob: result.status === 202 };
  },
};
