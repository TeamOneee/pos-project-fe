/** The Owner's headline figures. */

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { DeltaChip } from '@/components/pages/owner/delta-chip';

export function KpiTile({
  label,
  value,
  unit,
  hint,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  /** A small unit next to the figure, e.g. a shared-currency suffix. */
  unit?: string;
  /** A caption under the figure. */
  hint?: string;
  /**
   * A client-side growth delta against the preceding period. Passed by the Owner's dashboard; a
   * null delta reads as "Baru", not a fabricated +100%.
   */
  delta?: number | null;
  /** Accessible name for the delta chip when it differs from the tile label. */
  deltaLabel?: string;
}) {
  return (
    <div className="min-w-[140px] flex-1 basis-full tablet:basis-0">
      <Card className="h-full">
        <CardContent className="flex flex-col gap-sm pt-lg">
          <Text variant="label" tone="muted">
            {label}
          </Text>

          <div className="flex flex-row items-baseline gap-xs">
            <Text variant="h1" className="block truncate tabular-nums">
              {value}
            </Text>
            {unit ? (
              <Text variant="body" tone="muted">
                {unit}
              </Text>
            ) : null}
          </div>

          {delta !== undefined ? (
            delta === null ? (
              <Text variant="caption" tone="subtle">
                Baru
              </Text>
            ) : (
              <DeltaChip value={delta} label={deltaLabel ?? label} />
            )
          ) : (
            <Text variant="caption" tone="subtle">
              {hint ?? '\u00A0'}
            </Text>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
