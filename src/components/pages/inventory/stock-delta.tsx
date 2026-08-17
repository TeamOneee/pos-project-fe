/**
 * The change an adjustment would make, as a chip.
 *
 * Distinct from the Owner's DeltaChip, which shows a period-over-period
 * percentage. This one is a signed count of units, and the sign is in the text
 * so direction never rides on colour alone (CLAUDE.md rule 6).
 */

import { Text } from '@/components/ui/text';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';

/** "+5" · "−5" · "0". A true minus sign, not a hyphen. */
export function formatStockDelta(delta: number): string {
  if (delta === 0) return '0';
  const magnitude = formatCount(Math.abs(delta));
  return delta > 0 ? `+${magnitude}` : `−${magnitude}`;
}

export function StockDeltaChip({
  delta,
  label,
  className,
}: {
  delta: number;
  /** Prefix for the accessible label, e.g. "Perubahan". */
  label?: string;
  className?: string;
}) {
  const formatted = formatStockDelta(delta);
  const tone = delta === 0 ? 'neutral' : delta > 0 ? 'up' : 'down';

  return (
    <span
      aria-label={label ? `${label} ${formatted}` : formatted}
      className={cn(
        'inline-flex self-start rounded-full px-sm py-xs',
        tone === 'neutral' && 'bg-subtle',
        tone === 'up' && 'bg-success-subtle',
        tone === 'down' && 'bg-danger-subtle',
        className
      )}
    >
      <Text
        variant="caption"
        tone={tone === 'neutral' ? 'muted' : tone === 'up' ? 'success' : 'danger'}
      >
        {formatted}
      </Text>
    </span>
  );
}
