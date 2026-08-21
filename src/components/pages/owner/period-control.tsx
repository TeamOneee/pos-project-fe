/**
 * The Owner dashboard's period control: a dropdown of three rolling presets
 * with a manual range behind them.
 *
 * A dropdown rather than a chip row because it sits in a top bar next to the
 * outlet select, and two controls side by side should read as two controls of
 * the same kind. The trigger is styled to match `SelectTrigger` for that
 * reason, but the menu is written by hand — the same call `RowMenu` made, and
 * for the same reason: the app has no menu dependency, and Radix's Select
 * cannot carry an item that opens a dialog instead of choosing a value.
 *
 * The manual range is committed on "Terapkan", not as the fields are typed.
 * That is what keeps a half-typed or over-wide range from ever reaching a query
 * — the invalid state lives in this component's draft and never becomes the
 * selection the dashboard reads. It matters because not every hook the screen
 * fans out to can be disabled: `useTransactions` derives its own `enabled` and
 * takes no override, so "don't fetch that" is not something the data layer can
 * be asked for after the fact.
 *
 * The menu's open state and the dialog's draft stay in here deliberately. The
 * screen feeds its controls into the shell's top bar through an effect that
 * writes state, so anything that changes on every keystroke must not be visible
 * to that memo.
 */

import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatDayRangeShort, toApiDate } from '@/lib/date';
import {
  MAX_CUSTOM_RANGE_DAYS,
  PERIOD_PRESETS,
  PRESET_LABELS,
  parseLocalDay,
  validateCustomRange,
  type CustomRangeError,
  type PeriodPreset,
  type PeriodSelection,
} from '@/lib/period';
import { cn } from '@/lib/utils';

/**
 * An empty pair is a form in progress, not a mistake — the user has opened the
 * dialog and not finished. Terapkan stays disabled, but nothing is said.
 */
const ERROR_MESSAGES: Record<Exclude<CustomRangeError, 'INCOMPLETE'>, string> = {
  REVERSED: 'Tanggal mulai melebihi tanggal akhir.',
  // Says why, not just no: a 30-day preset sits right above this, and a bare
  // refusal at 7 days reads as a bug rather than a rule.
  TOO_WIDE: `Rentang maksimal ${MAX_CUSTOM_RANGE_DAYS} hari. Gunakan preset untuk rentang lebih panjang.`,
};

export function PeriodControl({
  value,
  onChange,
}: {
  value: PeriodSelection;
  onChange: (next: PeriodSelection) => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ from: '', to: '' });

  const container = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);

  const today = React.useMemo(() => toApiDate(new Date()), []);
  const error = validateCustomRange(draft.from, draft.to);

  // Dismissal, as RowMenu does it: an outside press or Escape closes the menu.
  // Escape also returns focus to the trigger, so the keyboard is not stranded
  // at the top of the document.
  React.useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!container.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      trigger.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const selectPreset = (preset: PeriodPreset) => {
    setMenuOpen(false);
    // A click on the active option is not a change. Emitting a fresh-but-equal
    // selection would churn every identity derived from it, including the node
    // the top bar re-reads through an effect.
    if (value.kind === 'PRESET' && value.preset === preset) return;
    onChange({ kind: 'PRESET', preset });
  };

  const openPicker = () => {
    setMenuOpen(false);
    // Seeded from the applied range, or from the last week when a preset is
    // active, so the dialog opens on something legal rather than empty.
    setDraft(
      value.kind === 'CUSTOM' ? { from: value.from, to: value.to } : { from: lastWeek(), to: today }
    );
    setPickerOpen(true);
  };

  const apply = () => {
    if (error) return;
    onChange({ kind: 'CUSTOM', from: draft.from, to: draft.to });
    setPickerOpen(false);
  };

  return (
    <div ref={container} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label="Pilih periode"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="flex min-h-touch min-w-[180px] flex-row items-center justify-between gap-sm rounded-md border border-border-interactive bg-surface px-md py-sm transition-colors focus:border-transparent focus-ring-always"
      >
        <Text variant="body">{triggerLabel(value)}</Text>
        <Icon as={ChevronDown} size={16} className="text-fg-muted" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Pilih periode"
          className="absolute left-0 top-full z-40 mt-xs flex min-w-full flex-col rounded-md border border-border bg-surface-raised p-xs shadow-lg"
        >
          {PERIOD_PRESETS.map((preset) => (
            <MenuItem
              key={preset}
              checked={value.kind === 'PRESET' && value.preset === preset}
              onSelect={() => selectPreset(preset)}
            >
              {PRESET_LABELS[preset]}
            </MenuItem>
          ))}

          {/*
            Separated because it is a different kind of thing: the three above
            choose a value and close, this one opens a dialog.
          */}
          <div className="my-xs h-px bg-border" role="separator" />

          <MenuItem checked={value.kind === 'CUSTOM'} onSelect={openPicker} aria-haspopup="dialog">
            {value.kind === 'CUSTOM' ? customLabel(value.from, value.to) : 'Pilih Tanggal…'}
          </MenuItem>
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="tablet:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Pilih Tanggal</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-md">
            <DateField
              label="Dari"
              value={draft.from}
              max={today}
              onChange={(from) => setDraft((current) => ({ ...current, from }))}
            />
            <DateField
              label="Sampai"
              value={draft.to}
              min={draft.from || undefined}
              max={today}
              onChange={(to) => setDraft((current) => ({ ...current, to }))}
            />

            {error && error !== 'INCOMPLETE' && (
              <Text variant="caption" tone="danger" role="alert" aria-live="polite">
                {ERROR_MESSAGES[error]}
              </Text>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>
              Batal
            </Button>
            <Button onClick={apply} disabled={error !== null}>
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * One row of the menu.
 *
 * `aria-checked` rather than `aria-selected`: this is a menu of mutually
 * exclusive choices, so the items are `menuitemradio`. The tick is doubled by
 * that state rather than being the only thing carrying it.
 */
function MenuItem({
  checked,
  onSelect,
  children,
  ...props
}: {
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'flex min-h-touch flex-row items-center justify-between gap-md rounded-sm px-md text-left outline-none transition-colors',
        'hover:bg-subtle focus-visible:bg-subtle'
      )}
      {...props}
    >
      <Text variant="body" tone={checked ? 'default' : 'muted'}>
        {children}
      </Text>
      {checked && <Icon as={Check} size={16} className="text-accent" />}
    </button>
  );
}

/** What the closed trigger says the dashboard is showing. */
function triggerLabel(value: PeriodSelection): string {
  return value.kind === 'PRESET' ? PRESET_LABELS[value.preset] : customLabel(value.from, value.to);
}

/** "15–21 Agu", falling back to the prompt if the pair somehow will not parse. */
function customLabel(from: string, to: string): string {
  const start = parseLocalDay(from);
  const end = parseLocalDay(to);
  if (!start || !end) return 'Pilih Tanggal…';
  return formatDayRangeShort(start, end);
}

/** `YYYY-MM-DD` six days back — a legal seed for an empty picker. */
function lastWeek(): string {
  const now = new Date();
  return toApiDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
}
