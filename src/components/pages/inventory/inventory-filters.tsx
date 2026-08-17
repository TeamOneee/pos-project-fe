/**
 * The filter bar for S-15: search by product or SKU, and narrow by condition.
 *
 * Both filters run in memory over the outlet's rows rather than as query
 * params — `GET /inventory` takes neither a search term nor a stock condition,
 * and the alternative would be a request per keystroke that the API cannot
 * answer anyway.
 */

import { Search } from 'lucide-react';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/pages/owner/controls';
import { stockLevel } from '@/lib/stock';

export const STOCK_CONDITIONS = ['ALL', 'OK', 'LOW', 'OUT'] as const;

export type StockCondition = (typeof STOCK_CONDITIONS)[number];

export const CONDITION_LABELS: Record<StockCondition, string> = {
  ALL: 'Semua',
  OK: 'Stok Aman',
  LOW: 'Stok Menipis',
  OUT: 'Stok Habis',
};

export function matchesCondition(
  quantity: number,
  threshold: number,
  condition: StockCondition
): boolean {
  if (condition === 'ALL') return true;
  const level = stockLevel(quantity, threshold);
  return (
    (condition === 'OK' && level === 'ok') ||
    (condition === 'LOW' && level === 'low') ||
    (condition === 'OUT' && level === 'out')
  );
}

/** Matches a product name or SKU, case-insensitively. */
export function matchesQuery(row: { name: string; sku: string }, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return row.name.toLowerCase().includes(needle) || row.sku.toLowerCase().includes(needle);
}

export function InventoryFilterBar({
  query,
  onQueryChange,
  condition,
  onConditionChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  condition: StockCondition;
  onConditionChange: (condition: StockCondition) => void;
}) {
  return (
    <div className="flex flex-col gap-md tablet:flex-row tablet:items-center tablet:justify-between">
      <div className="relative tablet:w-[320px]">
        <Icon
          as={Search}
          size={16}
          className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-fg-subtle"
        />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Cari produk atau SKU…"
          aria-label="Cari produk atau SKU"
          className="w-full pl-[36px]"
        />
      </div>

      <Segmented
        options={STOCK_CONDITIONS}
        value={condition}
        onChange={onConditionChange}
        labels={CONDITION_LABELS}
        accessibilityLabel="Filter kondisi stok"
      />
    </div>
  );
}
