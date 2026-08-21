/** S-14's catalogue reference figures. */

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { DashboardOperations } from '@/services/dashboard';
import { formatCount } from '@/lib/number';

/** How many product/outlet pairings actually hold stock. */
export function inStockCount(summary: DashboardOperations): number {
  return Math.max(0, summary.inventoryItemCount - summary.outOfStockItemCount);
}

export function CatalogueStrip({ summary }: { summary: DashboardOperations }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-md pt-lg">
        <div className="flex flex-col gap-lg tablet:flex-row tablet:flex-wrap">
          <Figure label="Produk Aktif" value={summary.activeProductCount} />
          <Figure label="Produk Berstok" value={inStockCount(summary)} />
          <Figure label="Produk Nonaktif" value={summary.inactiveProductCount} />
          <Figure label="Kategori Nonaktif" value={summary.inactiveCategoryCount} />
        </div>

        <Text variant="caption" tone="subtle">
          Katalog · seluruh merchant, bukan per outlet.
        </Text>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  const shown = formatCount(value);

  return (
    // The group name pairs label with value for a screen reader, which the two loose lines would
    // not do on their own.
    <div
      role="group"
      aria-label={`${label}: ${shown}`}
      className="flex min-w-[140px] flex-1 flex-col gap-xs"
    >
      <Text variant="label" tone="muted">
        {label}
      </Text>
      {/* h2, not h1: reference, not headline. */}
      <Text variant="h2" className="tabular-nums">
        {shown}
      </Text>
    </div>
  );
}
