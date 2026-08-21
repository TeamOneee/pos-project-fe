/**
 * The Owner dashboard's period control: three rolling presets and a manual
 * range behind them.
 *
 * The manual range is committed on "Terapkan", not as the fields are typed.
 * That is what keeps a half-typed or over-wide range from ever reaching a query
 * — the invalid state lives in this component's draft and never becomes the
 * selection the dashboard reads. It matters because not every hook the screen
 * fans out to can be disabled: `useTransactions` derives its own `enabled` and
 * takes no override, so "don't fetch that" is not something the data layer can
 * be asked for after the fact.
 *
 * The dialog's open and draft state stays in here deliberately. The screen
 * feeds its controls into the shell's top bar through an effect that writes
 * state, so anything that changes on every keystroke must not be visible to
 * that memo.
 */

import * as React from 'react';

import { Segmented } from '@/components/pages/owner/controls';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  // Says why, not just no: a 30-day preset sits right next to this, and a bare
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
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ from: '', to: '' });

  const today = React.useMemo(() => toApiDate(new Date()), []);
  const error = validateCustomRange(draft.from, draft.to);

  const selectPreset = (preset: PeriodPreset) => {
    // A click on the active chip is not a change. Emitting a fresh-but-equal
    // selection would churn every identity derived from it, including the node
    // the top bar re-reads through an effect.
    if (value.kind === 'PRESET' && value.preset === preset) return;
    onChange({ kind: 'PRESET', preset });
  };

  const openPicker = () => {
    // Seeded from the applied range, or from the last week when a preset is
    // active, so the dialog opens on something legal rather than empty.
    setDraft(
      value.kind === 'CUSTOM' ? { from: value.from, to: value.to } : { from: lastWeek(), to: today }
    );
    setOpen(true);
  };

  const apply = () => {
    if (error) return;
    onChange({ kind: 'CUSTOM', from: draft.from, to: draft.to });
    setOpen(false);
  };

  return (
    <>
      <Segmented
        options={PERIOD_PRESETS}
        value={value.kind === 'PRESET' ? value.preset : null}
        onChange={selectPreset}
        labels={PRESET_LABELS}
        accessibilityLabel="Pilih periode"
        trailing={
          <CustomChip active={value.kind === 'CUSTOM'} open={open} onClick={openPicker}>
            {value.kind === 'CUSTOM' ? customLabel(value.from, value.to) : 'Pilih Tanggal'}
          </CustomChip>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
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
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={apply} disabled={error !== null}>
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * The fourth tab. A tab by role — it is one of the period choices — but it
 * opens the picker rather than selecting a value, so it says so with
 * `aria-haspopup` and keeps `aria-selected` for whether a custom range is what
 * the dashboard is currently showing.
 */
function CustomChip({
  active,
  open,
  onClick,
  children,
}: {
  active: boolean;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        'min-h-touch shrink-0 justify-center rounded-sm px-md focus-ring',
        active ? 'bg-surface shadow-sm' : 'text-fg-muted hover:bg-border'
      )}
    >
      <Text variant="label" tone={active ? 'default' : 'muted'}>
        {children}
      </Text>
    </button>
  );
}

/** "15–21 Agu", falling back to the prompt if the pair somehow will not parse. */
function customLabel(from: string, to: string): string {
  const start = parseLocalDay(from);
  const end = parseLocalDay(to);
  if (!start || !end) return 'Pilih Tanggal';
  return formatDayRangeShort(start, end);
}

/** `YYYY-MM-DD` six days back — a legal seed for an empty picker. */
function lastWeek(): string {
  const now = new Date();
  return toApiDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
}
