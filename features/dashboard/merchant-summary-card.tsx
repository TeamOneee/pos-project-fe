/**
 * Row 2 right — what the merchant is made of, ending in the AI block.
 *
 * The AI block is a link, not a trigger. Running an analysis is a deliberate
 * act with its own screen (S-05); firing it from a dashboard tile would make it
 * too easy to start one by accident.
 */

import { Link } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { OwnerDashboard } from '@/lib/api/domains/dashboard';
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

      <CardContent className="flex-1 gap-md">
        <Text variant="h2" numberOfLines={2}>
          {overview.merchantName}
        </Text>

        <View className="gap-sm">
          <DefinitionRow label="Outlet aktif" value={formatCount(overview.totalOutletsActive)} />
          <DefinitionRow
            label="Karyawan aktif"
            value={formatCount(overview.totalEmployeesActive)}
          />
          <DefinitionRow label="Produk aktif" value={formatCount(overview.totalProductsActive)} />
          <DefinitionRow label="Kategori" value={formatCount(overview.totalCategories)} />
        </View>

        <View className="flex-1" />

        <Separator />

        <View className="gap-sm rounded-md bg-accent-subtle p-md">
          <View className="flex-row items-center gap-sm">
            <Icon as={Sparkles} size={16} className="text-accent" />
            <Text variant="caption" tone="muted" className="min-w-0 flex-1">
              {overview.lastAiAnalysis
                ? `Analisis AI terakhir: ${formatDateTime(overview.lastAiAnalysis)}`
                : 'Belum ada analisis AI'}
            </Text>
          </View>

          <Link href="/ai-insights" asChild>
            <Pressable role="link" className="self-start">
              <Button variant="secondary" size="sm">
                <Text>Lihat Insight</Text>
              </Button>
            </Pressable>
          </Link>
        </View>
      </CardContent>
    </Card>
  );
}

function DefinitionRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-md">
      <Text variant="body" tone="muted">
        {label}
      </Text>
      <Text variant="mono" className="type-body-strong">
        {value}
      </Text>
    </View>
  );
}
