/**
 * The required outlet choice for S-15.
 *
 * `GET /inventory` takes `outlet_id` as a required query param — there is no
 * all-outlets inventory list — so this is not a filter tucked into the top bar
 * but the control that decides whether there is a table at all. It sits at the
 * top of the content area and says so.
 *
 * Up to four outlets it is a segmented pill row, where every choice is visible
 * and one tap away. Beyond that the row stops fitting and it becomes a select.
 */

import { Store } from 'lucide-react';

import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** Above this many outlets the pill row becomes a select. */
export const PILL_ROW_LIMIT = 4;

export type OutletOption = { outletId: string; name: string };

type OutletPickerProps = {
  outlets: OutletOption[];
  /** Null until the user has chosen; the table stays empty until then. */
  value: string | null;
  onChange: (outletId: string) => void;
  label?: string;
  hint?: string;
  loading?: boolean;
};

export function OutletPicker({
  outlets,
  value,
  onChange,
  label = 'Outlet',
  hint = 'Stok dicatat per outlet, jadi pilih satu outlet dulu.',
  loading = false,
}: OutletPickerProps) {
  return (
    <div className="flex flex-col gap-sm rounded-lg border border-border bg-surface-raised p-lg">
      <div className="flex flex-row items-center gap-sm">
        <Icon as={Store} size={16} className="text-fg-muted" />
        <Label required htmlFor="outlet-picker">
          {label}
        </Label>
      </div>

      {loading ? (
        <Text variant="body" tone="muted">
          Memuat outlet…
        </Text>
      ) : outlets.length === 0 ? (
        <Text variant="body" tone="muted">
          Belum ada outlet aktif.
        </Text>
      ) : outlets.length <= PILL_ROW_LIMIT ? (
        <PillRow outlets={outlets} value={value} onChange={onChange} label={label} />
      ) : (
        <Select value={value ?? undefined} onValueChange={onChange}>
          <SelectTrigger id="outlet-picker" className="w-full tablet:max-w-[320px]">
            <SelectValue className="type-body text-fg" placeholder="Pilih outlet" />
          </SelectTrigger>
          <SelectContent>
            {outlets.map((outlet) => (
              <SelectItem key={outlet.outletId} value={outlet.outletId}>
                {outlet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Text variant="caption" tone="subtle">
        {hint}
      </Text>
    </div>
  );
}

function PillRow({
  outlets,
  value,
  onChange,
  label,
}: {
  outlets: OutletOption[];
  value: string | null;
  onChange: (outletId: string) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      id="outlet-picker"
      className="flex flex-row flex-wrap gap-sm"
    >
      {outlets.map((outlet) => {
        const active = outlet.outletId === value;

        return (
          <button
            key={outlet.outletId}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(outlet.outletId)}
            className={cn(
              'min-h-touch rounded-full border px-lg outline-none transition-colors focus-ring',
              active ? 'border-accent bg-accent' : 'border-border-strong bg-surface hover:bg-subtle'
            )}
          >
            <Text variant="body-strong" tone={active ? 'on-accent' : 'default'}>
              {outlet.name}
            </Text>
          </button>
        );
      })}
    </div>
  );
}
