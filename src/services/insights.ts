/**
 * Insight (BI) module — contract §7.2. Owner only, for both trigger and read.
 *
 * The shape to understand here is that **process state and results are two
 * different things** (§7.2 note). `analysis_job` carries the run — PENDING,
 * PROCESSING, RETRY_SCHEDULED, FAILED — while `insights[]` holds only finished
 * results, each READY or STALE. A screen polls the job and renders the results;
 * it never infers one from the other.
 *
 * One analysis per merchant per local day (§7.1 rule 2), deduped on
 * `merchant_id + analysis_date`. Triggering again the same day returns the
 * existing job with 200 rather than starting a second one with 202.
 *
 * A merchant that has never triggered an analysis gets 404, not an empty list —
 * that is the "no insight yet" state, not an error.
 */

import { z } from 'zod';

import { request, requestWithStatus } from '@/api/client';
import {
  analysisJobStatusSchema,
  id,
  insightStatusSchema,
  insightTypeSchema,
  isoDate,
  isoDateTime,
} from '@/api/schema';

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/* -------------------------------------------------------------------------- */

/** §7.1 `AiAnalysisJob`, as `GET /insights` reports it. */
const analysisJobSchema = z
  .object({
    id,
    status: analysisJobStatusSchema,
    analysis_date: isoDate,
    updated_at: isoDateTime,
  })
  .transform((value) => ({
    jobId: value.id,
    status: value.status,
    /** Local calendar date in the merchant's timezone; the dedupe key. */
    analysisDate: value.analysis_date,
    updatedAt: value.updated_at,
  }));

export type AnalysisJob = z.infer<typeof analysisJobSchema>;

/**
 * §7.4 `InsightResult`.
 *
 * `evidence_summary` is structured data the LLM was given and had to explain
 * (FR-AI-004/005), and its keys differ per insight type — so it stays an opaque
 * record here and the renderer decides what to do with it.
 */
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
  .object({ job_id: id, status: analysisJobStatusSchema })
  .transform((value) => ({ jobId: value.job_id, status: value.status }));

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
   * Queue today's analysis. Takes no body — §7.2 fixes the window at the 30
   * local days ending on the trigger date.
   *
   * 202 created a job; 200 means one already exists for today and no second run
   * was started. The status code is the only thing that distinguishes them.
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
