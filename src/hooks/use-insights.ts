/**
 * AI Insight (BI) — §7.2. Owner only.
 *
 * The read is polled while a job is running, because generation is asynchronous:
 * `POST /insights/trigger` queues work for the worker and returns immediately,
 * and `GET /insights` is how the screen learns it finished.
 *
 * A 404 is not an error state here — it is "this merchant has never run an
 * analysis", which is the empty state.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useGuardedMutation, type Requirement } from '@/hooks/use-guarded-mutation';
import { insightsApi } from '@/services/insights';
import { isApiErrorOfKind } from '@/api/errors';
import { queryKeys } from '@/lib/query-client';
import type { AnalysisJobStatus } from '@/api/schema';

const READ_INSIGHTS: Requirement = { resource: 'aiInsights', access: 'read' };

/** §7.1: the job states that mean the worker has not finished yet. */
const IN_PROGRESS: AnalysisJobStatus[] = ['PENDING', 'PROCESSING', 'RETRY_SCHEDULED'];

/** How often to re-ask while a job is running. */
const POLL_MS = 5_000;

export function useInsights(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.insights,
    queryFn: () => insightsApi.get(),
    enabled: options.enabled ?? true,
    // 404 means "never triggered", which the screen renders as an empty state
    // rather than a failure. Retrying it would only delay that.
    retry: (failureCount, error) =>
      !isApiErrorOfKind(error, 'not_found') &&
      !isApiErrorOfKind(error, 'forbidden') &&
      failureCount < 2,
    refetchInterval: (query) => {
      const status = query.state.data?.analysisJob.status;
      return status && IN_PROGRESS.includes(status) ? POLL_MS : false;
    },
  });
}

/**
 * Queue today's analysis.
 *
 * §7.1 rule 2 allows one per merchant per local day, so a second press the same
 * day returns the existing job (200) instead of starting another (202). The
 * screen reads `isNewJob` to word its confirmation honestly.
 */
export function useTriggerInsights() {
  const queryClient = useQueryClient();

  return useGuardedMutation(READ_INSIGHTS, {
    mutationFn: () => insightsApi.trigger(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.insights });
    },
  });
}

/** Re-exported so a screen can force a refresh without importing the client. */
export function useRefreshInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.insights });
    },
  });
}
