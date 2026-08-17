/**
 * Row 2 right — what the merchant is made of, ending in the AI block.
 *
 * The AI block is a link, not a trigger. Running an analysis is a deliberate
 * act with its own screen (S-05); firing it from a dashboard tile would make it
 * too easy to start one by accident.
 */

import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { OwnerDashboard } from '@/services/dashboard';
import { formatDateTime } from '@/lib/date';
import { formatCount } from '@/lib/number';

export function MerchantSummaryCard({
  overview,
  className,
}: {
  overview: OwnerDashboard['merchantOverview'];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Ringkasan Merchant</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-md">
        <Text variant="h2" className="block">
          {overview.merchantName}
        </Text>

        <div className="flex flex-col gap-sm">
          <DefinitionRow label="Outlet aktif" value={formatCount(overview.totalOutletsActive)} />
          <DefinitionRow
            label="Karyawan aktif"
            value={formatCount(overview.totalEmployeesActive)}
          />
          <DefinitionRow label="Produk aktif" value={formatCount(overview.totalProductsActive)} />
          <DefinitionRow label="Kategori" value={formatCount(overview.totalCategories)} />
        </div>

        <div className="flex-1" />

        <Separator />

        <div className="flex flex-col gap-sm rounded-md bg-accent-subtle p-md">
          <div className="flex flex-row items-center gap-sm">
            <Icon as={Sparkles} size={16} className="shrink-0 text-accent" />
            <Text variant="caption" tone="muted" className="min-w-0 flex-1">
              {overview.lastAiAnalysis
                ? `Analisis AI terakhir: ${formatDateTime(overview.lastAiAnalysis)}`
                : 'Belum ada analisis AI'}
            </Text>
          </div>

          <Link
            to="/ai-insights"
            className="inline-flex min-h-touch items-center justify-center gap-sm self-start rounded-md bg-subtle px-md py-sm outline-none transition-colors hover:bg-border focus-ring"
          >
            <Text variant="body-strong">Lihat Insight</Text>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function DefinitionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row items-center justify-between gap-md">
      <Text variant="body" tone="muted">
        {label}
      </Text>
      <Text variant="body-strong" className="tabular-nums">
        {value}
      </Text>
    </div>
  );
}
