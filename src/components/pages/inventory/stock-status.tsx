/**
 * How a stock level reads on screen: AMAN / MENIPIS / HABIS.
 *
 * The badge always carries its word — the colour only reinforces it
 * (CLAUDE.md rule 6). The row tint is decoration on top of that badge, never
 * the signal itself, so a table stays readable without colour.
 */

import type { BadgeProps } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { stockLevel, type StockLevel } from '@/lib/stock';

export const STOCK_LABEL: Record<StockLevel, string> = {
  ok: 'AMAN',
  low: 'MENIPIS',
  out: 'HABIS',
};

const STOCK_VARIANT: Record<StockLevel, NonNullable<BadgeProps['variant']>> = {
  ok: 'success',
  low: 'warning',
  out: 'danger',
};

/** Subtle row tint for the two alarm levels; AMAN rows stay on the surface. */
const ROW_TINT: Record<StockLevel, string> = {
  ok: '',
  low: 'bg-warning-subtle',
  out: 'bg-danger-subtle',
};

export function rowTint(level: StockLevel): string {
  return ROW_TINT[level];
}

export function StockBadge({ level, className }: { level: StockLevel; className?: string }) {
  return (
    <Badge variant={STOCK_VARIANT[level]} className={className}>
      <Text>{STOCK_LABEL[level]}</Text>
    </Badge>
  );
}

/** The badge for a raw quantity, when the caller has no level in hand. */
export function StockBadgeFor({ quantity, threshold }: { quantity: number; threshold: number }) {
  return <StockBadge level={stockLevel(quantity, threshold)} />;
}

/**
 * A count chip for the two alert columns of S-14's outlet table. Zero is not an
 * alarm, so it renders as a plain grey dash-chip rather than a coloured zero.
 */
export function AlertCountChip({
  count,
  tone,
  label,
}: {
  count: number;
  tone: 'warning' | 'danger';
  label: string;
}) {
  if (count === 0) {
    return (
      <Badge variant="neutral" aria-label={`${label}: tidak ada`}>
        <Text>—</Text>
      </Badge>
    );
  }

  return (
    <Badge variant={tone} aria-label={`${label}: ${count}`}>
      <Text>{count}</Text>
    </Badge>
  );
}
