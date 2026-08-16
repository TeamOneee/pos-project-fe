/**
 * AI insight. Owner only, manual trigger, one insight per merchant.
 *
 * No history, no archive, no dismiss, and nothing here mutates business data —
 * all four are out of scope.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aiInsightsApi } from '@/services/ai-insights';
import { isApiErrorOfKind } from '@/api/errors';
import { queryKeys } from '@/lib/query-client';

/** A 404 means no analysis has been run yet — an empty state, not an error. */
export function useAiInsight() {
  return useQuery({
    queryKey: queryKeys.aiInsights,
    queryFn: () => aiInsightsApi.get(),
    retry: (failureCount, error) => !isApiErrorOfKind(error, 'not_found') && failureCount < 1,
  });
}

/**
 * Trigger an analysis. Answers 202 when accepted and 409 when one is already
 * running — treat the 409 as "already started", not as a failure to report.
 */
export function useAnalyzeAiInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => aiInsightsApi.analyze(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights });
    },
  });
}
