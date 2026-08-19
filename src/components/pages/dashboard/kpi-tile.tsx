/**
 * The KPI tile used by both dashboards.
 *
 * The Owner's financial tiles and the Admin's operational tiles differ only in
 * what they carry — a growth delta versus an alarm tone, a shortcut, a hint —
 * so they are one component, not two siblings that drifted apart.
 *
 * The alarm colour is never the only signal: a warning or danger tile still
 * names its condition in the label, and a pressable tile says in its hint what
 * tapping it does.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { DeltaChip } from '@/components/pages/owner/delta-chip';
import { cn } from '@/lib/utils';

export function KpiTile({
  label,
  value,
  unit,
  hint,
  tone = 'neutral',
  onPress,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  /** A small unit next to the figure, e.g. a shared-currency suffix. */
  unit?: string;
  /** A caption under the figure; for a pressable tile, what tapping does. */
  hint?: string;
  tone?: 'neutral' | 'warning' | 'danger';
  onPress?: () => void;
  /**
   * A client-side growth delta against the preceding period. Passed by the
   * Owner's dashboard; a null delta reads as "Baru", not a fabricated +100%.
   */
  delta?: number | null;
  /** Accessible name for the delta chip when it differs from the tile label. */
  deltaLabel?: string;
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
  );

  // Stacked on mobile, across from tablet up.
  const sizing = 'min-w-[140px] flex-1 basis-full tablet:basis-0';

  if (!onPress) return <div className={sizing}>{body}</div>;

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={`${label}: ${value}. ${hint ?? ''}`.trim()}
      className={cn(sizing, 'rounded-lg text-left focus-ring')}
    >
      {body}
    </button>
  );
}
