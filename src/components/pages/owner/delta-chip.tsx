/** A period-over-period change, as a chip. */

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
