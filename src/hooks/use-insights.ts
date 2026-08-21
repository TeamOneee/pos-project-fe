/** AI Insight (BI) — §7.2. Owner only. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useGuardedMutation, type Requirement } from '@/hooks/use-guarded-mutation';
import { insightsApi } from '@/services/insights';
import { isApiErrorOfKind } from '@/api/errors';
import { queryKeys } from '@/lib/query-client';
import { useToast } from '@/components/ui/toast';
import type { AnalysisJobStatus } from '@/api/schema';

const READ_INSIGHTS: Requirement = { resource: 'aiInsights', access: 'read' };

/** §7.1: the job states that mean the worker has not finished yet. */
export const IN_PROGRESS_JOB_STATUSES: AnalysisJobStatus[] = [
  'PENDING',
  'PROCESSING',
  'RETRY_SCHEDULED',
];

/** How often to re-ask while a job is running. */
const POLL_MS = 5_000;

export function useInsights(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.insights,
    queryFn: () => insightsApi.get(),
    enabled: options.enabled ?? true,
    // 404 means "never triggered", which the screen renders as an empty state rather than a
    // failure.
    retry: (failureCount, error) =>
      !isApiErrorOfKind(error, 'not_found') &&
      !isApiErrorOfKind(error, 'forbidden') &&
      failureCount < 2,
    refetchInterval: (query) => {
      const status = query.state.data?.analysisJob.status;
      return status && IN_PROGRESS_JOB_STATUSES.includes(status) ? POLL_MS : false;
    },
  });
}

/** Queue today's analysis. */
export function useTriggerInsights() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useGuardedMutation(READ_INSIGHTS, {
    mutationFn: () => insightsApi.trigger(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.insights });
    },
    onError: (error) => {
      if (isApiErrorOfKind(error, 'not_found')) {
        toast({
          variant: 'info',
          title: 'Belum ada insight',
          description: 'Merchant belum pernah memtrigger analisis insight.',
        });
        return;
      }
      if (isApiErrorOfKind(error, 'forbidden')) {
        toast({
          variant: 'warning',
          title: 'Akses ditolak',
          description: 'Peran Anda tidak memiliki izin untuk memtrigger analisis insight.',
        });
        return;
      }
      if (isApiErrorOfKind(error, 'unauthorized')) {
        toast({
          variant: 'error',
          title: 'Sesi expiring',
          description: 'Token otentikasi telah expiring. Silakan login kembali.',
        });
        return;
      }
      if (isApiErrorOfKind(error, 'rate_limited')) {
        toast({
          variant: 'warning',
          title: 'Terlalu banyak permintaan',
          description: 'Silakan tunggu beberapa saat sebelum mencoba lagi.',
        });
        return;
      }
      if (isApiErrorOfKind(error, 'server') || isApiErrorOfKind(error, 'timeout')) {
        toast({
          variant: 'warning',
          title: 'Gagal koneksi',
          description: 'Terjadi kesalahan sementara. Coba lagi dalam beberapa saat.',
        });
        return;
      }
      toast({
        variant: 'error',
        title: 'Gagal memtrigger',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui',
      });
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
