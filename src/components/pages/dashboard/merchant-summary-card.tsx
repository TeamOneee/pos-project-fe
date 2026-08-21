/** Row 2 right — what the merchant is made of, ending in the AI block. */

import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { formatDateTime } from '@/lib/date';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';

export type MerchantOverview = {
  merchantName: string;
  activeOutlets: number;
  activeStaff: number;
  activeProducts: number;
  totalCategories: number;
  /** Null until the merchant has ever triggered an analysis. */
  lastAiAnalysis: string | null;
};

export function MerchantSummaryCard({
  overview,
  className,
}: {
  overview: MerchantOverview;
  className?: string;
}) {
  return (
    <Card className={cn('border-white/10 bg-accent', className)}>
      <CardHeader>
        <CardTitle tone="on-accent">Ringkasan Merchant</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-md">
        <Text variant="h2" tone="on-accent" className="block">
          {overview.merchantName}
        </Text>

        <div className="flex flex-col gap-sm">
          <DefinitionRow label="Outlet aktif" value={formatCount(overview.activeOutlets)} />
          <DefinitionRow label="Karyawan aktif" value={formatCount(overview.activeStaff)} />
          <DefinitionRow label="Produk aktif" value={formatCount(overview.activeProducts)} />
          <DefinitionRow label="Kategori" value={formatCount(overview.totalCategories)} />
        </div>

        <div className="flex-1" />

        <Separator className="bg-white/20" />

        <div className="flex flex-col gap-sm rounded-md bg-white/15 p-md">
          <div className="flex flex-row items-center gap-sm">
            <Icon as={Sparkles} size={16} className="shrink-0 text-white" />
            <Text variant="caption" tone="on-accent" className="min-w-0 flex-1 opacity-80">
              {overview.lastAiAnalysis
                ? `Analisis AI terakhir: ${formatDateTime(overview.lastAiAnalysis)}`
                : 'Belum ada analisis AI'}
            </Text>
          </div>

          <Link
            to="/ai-insights"
            className="inline-flex min-h-touch items-center justify-center gap-sm self-start rounded-md bg-white/20 px-md py-sm text-white outline-none transition-colors hover:bg-white/30 focus-ring"
          >
            <Text variant="body-strong" tone="on-accent">
              Lihat Insight
            </Text>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function DefinitionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row items-center justify-between gap-md">
      <Text variant="body" tone="on-accent" className="opacity-70">
        {label}
      </Text>
      <Text variant="body-strong" tone="on-accent" className="tabular-nums">
        {value}
      </Text>
    </div>
  );
}
