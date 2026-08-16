/**
 * A period-over-period change, as a chip.
 *
 * The sign is carried by the text itself (from formatPercentDelta), so
 * direction is never carried by colour alone — a reader who cannot distinguish
 * the green from the red still sees the sign.
 */

import { Text } from '@/components/ui/text';
import { formatPercentDelta } from '@/lib/number';
import { cn } from '@/lib/utils';

type DeltaChipProps = {
  value: number;
  /** Prefix for the accessible label, e.g. "Omzet". */
  label?: string;
  className?: string;
};

export function DeltaChip({ value, label, className }: DeltaChipProps) {
  const positive = value >= 0;
  const formatted = formatPercentDelta(value);

  return (
    <span
      aria-label={label ? `${label} ${formatted}` : formatted}
      className={cn(
        'inline-flex self-start rounded-full px-sm py-xs',
        positive ? 'bg-success-subtle' : 'bg-danger-subtle',
        className
      )}
    >
      <Text variant="caption" tone={positive ? 'success' : 'danger'}>
        {formatted}
      </Text>
    </span>
  );
}
