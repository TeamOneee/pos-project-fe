/**
 * A period-over-period change, as a chip.
 *
 * The arrow and the sign come from formatPercentDelta, so direction is never
 * carried by colour alone — a reader who cannot distinguish the green from the
 * red still sees ▲ or ▼.
 */

import { View } from 'react-native';

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
    <View
      accessibilityLabel={label ? `${label} ${formatted}` : formatted}
      className={cn(
        'self-start rounded-full px-sm py-xs',
        positive ? 'bg-success-subtle' : 'bg-danger-subtle',
        className
      )}
    >
      <Text variant="caption" tone={positive ? 'success' : 'danger'}>
        {formatted}
      </Text>
    </View>
  );
}
