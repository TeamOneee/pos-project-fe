/**
 * AI Insight module — contract §4.12. Owner only.
 *
 * The merchant/insight relation is 1:1 and the system keeps no history: this
 * returns the latest analysis, full stop. History, archive and dismiss are all
 * out of scope, as is any AI action that mutates data.
 *
 * Triggering an analysis while one is already running answers 409 — treat that
 * as "already started", not as a failure worth surfacing as an error.
 */

import { z } from 'zod';

import { request } from '@/api/client';
import { id, isoDateTime } from '@/api/schema';

/** Unknown insight types must not break the screen. */
const insightTypeSchema = z
  .enum(['STOCK_WARNING', 'SALES_TREND', 'PRODUCT_PERFORMANCE', 'GENERAL'])
  .catch('GENERAL');

const insightStatusSchema = z.enum(['READY', 'PROCESSING', 'FAILED']).catch('READY');

export const aiInsightSchema = z
  .object({
    insight_id: id,
    merchant_id: id.optional(),
    title: z.string(),
    content: z.string(),
    type: insightTypeSchema,
    status: insightStatusSchema,
    created_at: isoDateTime.optional(),
    updated_at: isoDateTime.optional(),
  })
  .transform((value) => ({
    insightId: value.insight_id,
    merchantId: value.merchant_id ?? null,
    title: value.title,
    content: value.content,
    type: value.type,
    status: value.status,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
  }));

export type AiInsight = z.infer<typeof aiInsightSchema>;

const analyzeJobSchema = z
  .object({
    job_id: id,
    status: z.string(),
    message: z.string().optional(),
  })
  .transform((value) => ({
    jobId: value.job_id,
    status: value.status,
    message: value.message ?? '',
  }));

export type AnalyzeJob = z.infer<typeof analyzeJobSchema>;

export const aiInsightsApi = {
  /** 404 when no analysis has ever been run for this merchant. */
  get: () => request({ method: 'GET', path: '/ai-insights', schema: aiInsightSchema }),

  /** 202 when accepted, 409 when an analysis is already in flight. */
  analyze: () =>
    request({ method: 'POST', path: '/ai-insights/analyze', schema: analyzeJobSchema }),
};
