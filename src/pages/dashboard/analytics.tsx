/**
 * S-04 · Analitik — the Owner's deep dive.
 *
 * Four tabs over the same reporting endpoints the dashboard uses (§6.2); the
 * difference is the controls, not the data source. Owner only: §6.1 rule 1
 * keeps revenue, AOV and business analytics away from the Admin entirely.
 */

import * as React from 'react';

import { Text } from '@/components/ui/text';
import {
  AovTrendPanel,
  ProductPerformancePanel,
  SalesTrendPanel,
  TimePatternPanel,
} from '@/components/pages/analytics/analytics-panels';
import { Segmented } from '@/components/pages/owner/controls';
import { useOutlets } from '@/hooks/use-outlets';

const ANALYTICS_TABS = ['SALES', 'TIME', 'AOV', 'PRODUCTS'] as const;
type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

const TAB_LABELS: Record<AnalyticsTab, string> = {
  SALES: 'Tren Penjualan',
  TIME: 'Pola Waktu',
  AOV: 'Tren AOV',
  PRODUCTS: 'Performa Produk',
};

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = React.useState<AnalyticsTab>('SALES');
  const outlets = useOutlets({ status: 'ACTIVE' });

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      <div className="flex flex-col gap-xs">
        <Text variant="h1">Analitik</Text>
        <Text variant="body" tone="muted">
          Analisis mendalam performa bisnis Anda.
        </Text>
      </div>

      <Segmented
        options={ANALYTICS_TABS}
        value={activeTab}
        onChange={setActiveTab}
        labels={TAB_LABELS}
        accessibilityLabel="Bagian analitik"
      />

      {activeTab === 'SALES' && <SalesTrendPanel outlets={outlets.data?.items ?? []} />}
      {activeTab === 'TIME' && <TimePatternPanel outlets={outlets.data?.items ?? []} />}
      {activeTab === 'AOV' && <AovTrendPanel outlets={outlets.data?.items ?? []} />}
      {activeTab === 'PRODUCTS' && <ProductPerformancePanel outlets={outlets.data?.items ?? []} />}
    </div>
  );
}
