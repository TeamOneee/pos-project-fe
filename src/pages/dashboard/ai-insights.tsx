/** S-05 · AI Insight, against contract §7. */

import { Copy, Sparkles } from 'lucide-react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormBanner } from '@/components/ui/form-banner';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useInsights, useTriggerInsights, IN_PROGRESS_JOB_STATUSES } from '@/hooks/use-insights';
import { isApiErrorOfKind } from '@/api/errors';
import type { InsightType } from '@/api/schema';
import { formatDateTime } from '@/lib/date';
import type { Insight } from '@/services/insights';
import { cn } from '@/lib/utils';

/** §7.1's five types, read in Bahasa for the badge. */
const INSIGHT_TYPE_META: Record<InsightType, { label: string; variant: BadgeProps['variant'] }> = {
  SALES_TREND: { label: 'Tren Penjualan', variant: 'info' },
  OUTLET_COMPARISON: { label: 'Perbandingan Outlet', variant: 'accent' },
  TOP_PRODUCTS: { label: 'Produk Terlaris', variant: 'accent' },
  TIME_PATTERN: { label: 'Pola Waktu', variant: 'info' },
  AOV_TREND: { label: 'Tren AOV', variant: 'info' },
};

export default function AiInsightsPage() {
  const insights = useInsights();
  const trigger = useTriggerInsights();
  const { toast } = useToast();

  const notFound = isApiErrorOfKind(insights.error, 'not_found');
  const job = insights.data?.analysisJob;
  const results = insights.data?.insights ?? [];

  const jobRunning = job !== undefined && IN_PROGRESS_JOB_STATUSES.includes(job.status);
  const jobFailed = job?.status === 'FAILED';

  const handleTrigger = () => {
    trigger.mutate(undefined, {
      onSuccess: (result) => {
        if (result.status === 'FAILED') {
          toast({
            variant: 'warning',
            title: 'Analisis hari ini gagal diproses',
            description:
              'Analisis sudah pernah dicoba hari ini dan tidak dapat diulang sampai besok.',
          });
          return;
        }
        toast({
          variant: result.isNewJob ? 'success' : 'info',
          title: result.isNewJob ? 'Analisis dijadwalkan' : 'Analisis sedang berjalan',
          description: result.isNewJob
            ? 'Hasil akan muncul di halaman ini dalam beberapa saat.'
            : 'Analisis hari ini sudah dijalankan. Tunggu hingga selesai.',
        });
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
  };

  const busy = jobRunning || trigger.isPending;

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[960px]">
      {/* The shell's top bar carries the title; this is its subtitle. */}
      <Text variant="body" tone="muted">
        Analisis dan rekomendasi bisnis berbasis data Anda.
      </Text>

      {jobFailed && (
        <FormBanner title="Analisis terakhir gagal diproses">
          <Text variant="caption" tone="muted">
            Analisis hari ini tidak dapat diulang sampai besok.
          </Text>
        </FormBanner>
      )}

      {insights.isError && !notFound ? (
        <FormBanner title="Gagal memuat insight.">
          <Text variant="caption" tone="muted">
            Periksa koneksi Anda, lalu coba kembali.
          </Text>
        </FormBanner>
      ) : null}

      <HeroActionCard
        busy={busy}
        lastAnalysisAt={job?.updatedAt ?? null}
        onTrigger={handleTrigger}
      />

      {insights.isPending ? (
        <ResultSkeleton />
      ) : notFound ? (
        <EmptyStateCard />
      ) : jobRunning ? (
        <ProcessingCard />
      ) : jobFailed && results.length === 0 ? (
        <FailedStateCard />
      ) : (
        <div className="flex flex-col gap-lg">
          {results.map((insight) => (
            <InsightResultCard key={insight.insightId} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                       */
/* -------------------------------------------------------------------------- */

function HeroActionCard({
  busy,
  lastAnalysisAt,
  onTrigger,
}: {
  busy: boolean;
  lastAnalysisAt: string | null;
  onTrigger: () => void;
}) {
  return (
    <div className="rounded-lg border border-accent/30 bg-accent-subtle p-lg">
      <div className="flex flex-col gap-md tablet:flex-row tablet:items-center">
        <div className="flex min-w-0 flex-row items-center gap-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
            <Icon as={Sparkles} size={22} className="text-accent" />
          </div>
          <div className="flex min-w-0 flex-col gap-xs">
            <Text variant="h2">Analisis dengan AI</Text>
            <Text variant="body" tone="muted">
              Jalankan analisis kapan saja untuk mendapatkan rekomendasi terbaru berdasarkan data
              penjualan dan stok Anda.
            </Text>
          </div>
        </div>

        <div className="flex flex-col items-start gap-xs tablet:ml-auto tablet:items-end">
          <Button size="lg" loading={busy} onClick={onTrigger}>
            <Text>{busy ? 'Menganalisis…' : 'Analisis dengan AI'}</Text>
          </Button>
          {lastAnalysisAt && (
            <Text variant="caption" tone="muted">
              Analisis terakhir: {formatDateTime(lastAnalysisAt)}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}

function ProcessingCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-md p-xl text-center">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-accent-subtle">
          <Icon as={Sparkles} size={22} className="text-accent" />
        </div>
        <Text variant="h3">Sedang menganalisis…</Text>
        <Text variant="body" tone="muted" className="max-w-[420px]">
          Analisis sedang diproses. Hasil akan muncul dalam beberapa saat.
        </Text>
        <div className="h-1 w-full max-w-[420px] overflow-hidden rounded-full bg-subtle">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyStateCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-md p-xl text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle">
          <Icon as={Sparkles} size={22} className="text-fg-muted" />
        </div>
        <Text variant="h3">Belum ada insight</Text>
        <Text variant="body" tone="muted" className="max-w-[420px]">
          Jalankan analisis pertama Anda untuk melihat rekomendasi bisnis.
        </Text>
      </CardContent>
    </Card>
  );
}

function FailedStateCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-md p-xl text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle">
          <Icon as={Sparkles} size={22} className="text-fg-muted" />
        </div>
        <Text variant="h3">Analisis gagal diproses</Text>
        <Text variant="body" tone="muted" className="max-w-[420px]">
          Terjadi kendala saat menganalisis data Anda. Silakan coba lagi besok.
        </Text>
      </CardContent>
    </Card>
  );
}

function InsightResultCard({ insight }: { insight: Insight }) {
  const { toast } = useToast();
  const meta = INSIGHT_TYPE_META[insight.type];

  const handleCopy = async () => {
    const copied = await copyText(`${insight.title}\n\n${insight.content}`);
    toast({
      variant: copied ? 'success' : 'warning',
      title: copied ? 'Insight disalin' : 'Gagal menyalin',
      description: copied
        ? 'Pesan insight sudah disalin ke clipboard.'
        : 'Peramban Anda menolak akses clipboard.',
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-md p-lg">
        <div className="flex flex-col gap-sm py-5">
          <Badge variant={meta.variant}>
            <Text>{meta.label}</Text>
          </Badge>
          <Text variant="h2" className="block">
            {insight.title}
          </Text>
        </div>

        <Text variant="body" className="max-w-[720px] leading-[1.6]">
          {insight.content}
        </Text>

        {insight.status === 'STALE' && (
          <Text variant="caption" tone="warning">
            Data insight ini mungkin sudah usang.
          </Text>
        )}

        <Separator />

        <div className="flex flex-row items-center justify-between gap-md">
          <Text variant="caption" tone="muted">
            Diperbarui {formatDateTime(insight.generatedAt)}
          </Text>
          <button
            onClick={() => void handleCopy()}
            className={cn(
              'flex min-h-touch items-center justify-center gap-sm rounded-md px-md outline-none transition-colors hover:bg-subtle focus-ring'
            )}
          >
            <Icon as={Copy} size={14} className="text-accent-text" />
            <Text variant="caption" tone="accent">
              Salin
            </Text>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-lg">
      {[0, 1, 2].map((index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-md p-lg">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-6 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Copy with a `navigator.clipboard`-first, `execCommand` fallback, because some embedded webviews
 * refuse the async clipboard API without a permission.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  try {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(helper);
    return ok;
  } catch {
    return false;
  }
}
