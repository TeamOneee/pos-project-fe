/**
 * S-14's catalogue reference figures.
 *
 * These are context, not work, so they sit below the queue and read quietly.
 * They are also the screen's only merchant-wide numbers, and that is the whole
 * reason they were moved down here: standing in the outlet-filtered row above,
 * "Produk Aktif" stayed at 13 while every neighbour narrowed, and a per-outlet
 * count of 14 appeared to exceed a merchant-wide count of 13. Neither number was
 * wrong; they answered different questions in a row that implied one. Putting
 * them in their own captioned section makes the scope a property of the section
 * rather than a caveat nobody reads.
 *
 * Deliberately not built from KpiTile: that component hardcodes a `basis-full`
 * tile width for the Owner's headline figures, and these must not read as
 * headline figures. **Nothing in this file may carry `basis-full`** — a stray one
 * would be picked up by the responsive suite's tile query and fail on a screen
 * that has no tiles.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { DashboardOperations } from '@/services/dashboard';
import { formatCount } from '@/lib/number';

/**
 * How many product/outlet pairings actually hold stock.
 *
 * `/dashboard/operations` has no field for this. `inventory_item_count` is every
 * inventory row, empties included — a coverage count, not a stock count — and
 * rendering it under an "in stock" label meant the screen counted the same five
 * empty shelves as both stocked and out of stock. The endpoint does report that
 * empty subset, and both figures are computed over the same rows, so the
 * difference is exact.
 *
 * This is a workaround, not a design: the durable fix is an `in_stock_item_count`
 * field on the endpoint. Clamped because a backend that redefines either field
 * must not be able to render a negative.
 */
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
          Katalog · seluruh merchant, tidak terpengaruh filter outlet.
        </Text>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  const shown = formatCount(value);

  return (
    // The group name pairs label with value for a screen reader, which the two
    // loose lines would not do on their own.
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
