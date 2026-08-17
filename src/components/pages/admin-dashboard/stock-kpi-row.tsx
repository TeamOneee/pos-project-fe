/**
 * S-14 row 1 — four operational tiles.
 *
 * These are not the Owner's financial KPIs and they do not carry a growth
 * delta: nobody wants to know that "stok habis" is up 12% on last month, they
 * want to know it is three and which three. So the two alarm tiles are
 * shortcuts — each is a button that scrolls to the table listing exactly the
 * products it is counting.
 *
 * The alarm colour is never the only signal: the label names the condition and
 * the tile says what tapping it does.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { AdminDashboard } from '@/services/dashboard';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';

export function StockKpiRow({
  summary,
  onShowLowStock,
  onShowOutOfStock,
}: {
  summary: AdminDashboard['summary'];
  onShowLowStock: () => void;
  onShowOutOfStock: () => void;
}) {
  return (
    <div className="flex flex-row flex-wrap gap-lg">
      <KpiTile label="Total Produk" value={formatCount(summary.totalProducts)} />
      <KpiTile label="Total Stok" value={formatCount(summary.totalStockItems)} unit="unit" />
      <KpiTile
        label="Stok Menipis"
        value={formatCount(summary.lowStockProductsCount)}
        tone="warning"
        onPress={onShowLowStock}
        hint="Lihat daftar"
      />
      <KpiTile
        label="Stok Habis"
        value={formatCount(summary.outOfStockProductsCount)}
        tone="danger"
        onPress={onShowOutOfStock}
        hint="Lihat daftar"
      />
    </div>
  );
}

function KpiTile({
  label,
  value,
  unit,
  tone = 'neutral',
  onPress,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'neutral' | 'warning' | 'danger';
  onPress?: () => void;
  hint?: string;
}) {
  const body = (
    <Card
      className={cn(
        'h-full',
        // The 3px alarm rail. Neutral tiles keep the plain card border.
        tone === 'warning' && 'border-l-[3px] border-l-warning',
        tone === 'danger' && 'border-l-[3px] border-l-danger',
        onPress && 'transition-colors hover:bg-subtle'
      )}
    >
      <CardContent className="flex flex-col gap-sm pt-lg">
        <Text variant="label" tone="muted">
          {label}
        </Text>

        <div className="flex flex-row items-baseline gap-xs">
          <Text
            variant="h1"
            tone={tone === 'neutral' ? 'default' : tone}
            className="block truncate tabular-nums"
          >
            {value}
          </Text>
          {unit ? (
            <Text variant="body" tone="muted">
              {unit}
            </Text>
          ) : null}
        </div>

        <Text variant="caption" tone="subtle">
          {hint ?? ' '}
        </Text>
      </CardContent>
    </Card>
  );

  const sizing = 'min-w-[140px] flex-1 basis-[calc(50%-8px)] tablet:basis-0';

  if (!onPress) return <div className={sizing}>{body}</div>;

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={`${label}: ${value}. ${hint ?? ''}`.trim()}
      className={cn(
        sizing,
        'rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-accent'
      )}
    >
      {body}
    </button>
  );
}
