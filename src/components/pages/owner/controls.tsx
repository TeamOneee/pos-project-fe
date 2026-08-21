/**
 * The controls shared by the Owner's dashboard and analytics screens.
 *
 * The freshness caption is not decoration. §6.1 rule 3 builds the Owner's
 * aggregates cache-aside with a 30-minute TTL, and every response reports both
 * `data_updated_at` and a `FRESH`/`STALE` flag. The figures on screen are
 * genuinely minutes old, and a screen that looks live while being stale is the
 * kind of thing a business decision gets made on. So the caption reads the
 * server's own timestamp — not the moment we fetched it — and surfaces STALE
 * explicitly, since §6.2 deliberately returns stale aggregates as 200s rather
 * than failing.
 */

import { RefreshCw } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import type { Outlet } from '@/services/outlets';
import { formatDateTime, formatTimeAgo } from '@/lib/date';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Outlet                                                                      */
/* -------------------------------------------------------------------------- */

export const ALL_OUTLETS = 'ALL';

export function OutletSelect({
  outlets,
  value,
  onChange,
}: {
  outlets: Pick<Outlet, 'outletId' | 'name'>[];
  /** Null means every outlet. */
  value: string | null;
  onChange: (outletId: string | null) => void;
}) {
  return (
    <Select
      value={value ?? ALL_OUTLETS}
      onValueChange={(next) => onChange(next === ALL_OUTLETS ? null : next)}
    >
      <SelectTrigger className="min-w-[180px]" aria-label="Pilih outlet">
        <SelectValue className="type-body text-fg" placeholder="Semua Outlet" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_OUTLETS}>Semua Outlet</SelectItem>
        {outlets.map((outlet) => (
          <SelectItem key={outlet.outletId} value={outlet.outletId}>
            {outlet.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* -------------------------------------------------------------------------- */
/* Segmented                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A segmented control that scrolls horizontally when it has to. That is the
 * same component the brief asks for at desktop and the chip row it asks for on
 * mobile — the only difference is whether the content overflows.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  labels,
  accessibilityLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels: Record<T, string>;
  accessibilityLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={accessibilityLabel}
      className="flex min-w-0 max-w-full flex-row gap-xs overflow-x-auto rounded-md bg-subtle p-xs"
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            className={cn(
              'min-h-touch shrink-0 justify-center rounded-sm px-md focus-ring',
              active ? 'bg-surface shadow-sm' : 'text-fg-muted hover:bg-border'
            )}
          >
            <Text variant="label" tone={active ? 'default' : 'muted'}>
              {labels[option]}
            </Text>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Freshness                                                                   */
/* -------------------------------------------------------------------------- */

export function FreshnessCaption({
  updatedAt,
  stale = false,
  refreshing,
  onRefresh,
}: {
  /**
   * Epoch millis of the server's `data_updated_at` — when the aggregate was
   * built, not when we fetched it. 0 while nothing has loaded.
   */
  updatedAt: number;
  /** The server flagged this read `STALE` (§6.1); say so rather than hide it. */
  stale?: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  // Re-renders on a timer so "2 menit lalu" does not sit there saying "baru
  // saja" ten minutes after the fact.
  const [, tick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => tick((value) => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const absolute = updatedAt === 0 ? '' : formatDateTime(updatedAt);
  const relative = updatedAt === 0 ? '' : formatTimeAgo(updatedAt);
  return (
    <div
      className="flex items-center gap-xs"
      title={updatedAt === 0 ? undefined : `Cache 30m · ${absolute}`}
    >
      <Text variant="caption" tone={stale ? 'warning' : 'subtle'}>
        {updatedAt === 0
          ? 'Memuat…'
          : stale
            ? `Kedaluwarsa · ${absolute} (${relative})`
            : `Cache 30m · ${absolute} (${relative})`}
      </Text>
      <button
        type="button"
        aria-label="Perbarui data"
        aria-busy={refreshing || undefined}
        disabled={refreshing}
        onClick={onRefresh}
        className="flex h-touch w-touch items-center justify-center rounded-md outline-none hover:bg-subtle focus-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon
          as={RefreshCw}
          size={16}
          className={cn(
            'transition-transform',
            refreshing ? 'text-fg-subtle animate-spin' : 'text-fg-muted'
          )}
        />
      </button>
    </div>
  );
}
