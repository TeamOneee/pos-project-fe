/** A quantity input with − / + on either side. */

import { Minus, Plus } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type StepperInputProps = {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  invalid?: boolean;
  /** `lg` is the 48px modal control; `sm` fits an editable table row. */
  size?: 'sm' | 'lg';
  'aria-label'?: string;
};

export function StepperInput({
  value,
  onChange,
  id,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  disabled = false,
  invalid = false,
  size = 'lg',
  'aria-label': ariaLabel,
}: StepperInputProps) {
  // Mirrors `value` while the user types, so clearing the field is possible.
  const [draft, setDraft] = React.useState(String(value));

  React.useEffect(() => {
    setDraft((current) => (Number(current) === value ? current : String(value)));
  }, [value]);

  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const step = (by: number) => onChange(clamp(value + by));

  const large = size === 'lg';

  return (
    <div className="flex flex-row items-center gap-sm">
      <StepButton
        label="Kurangi satu"
        icon={Minus}
        large={large}
        disabled={disabled || value <= min}
        onClick={() => step(-1)}
      />

      <Input
        id={id}
        numeric
        inputMode="numeric"
        aria-label={ariaLabel}
        disabled={disabled}
        invalid={invalid}
        value={draft}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d]/g, '');
          setDraft(next);
          onChange(next === '' ? min : clamp(Number(next)));
        }}
        onBlur={() => setDraft(String(value))}
        className={cn('min-w-0 flex-1 text-center', large && 'min-h-[48px] type-h1 tabular-nums')}
      />

      <StepButton
        label="Tambah satu"
        icon={Plus}
        large={large}
        disabled={disabled || value >= max}
        onClick={() => step(1)}
      />
    </div>
  );
}

function StepButton({
  label,
  icon,
  large,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ComponentProps<typeof Icon>['as'];
  large: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface',
        'outline-none transition-colors hover:bg-subtle focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        large ? 'h-[48px] w-[48px]' : 'h-touch w-touch'
      )}
    >
      <Icon as={icon} size={large ? 20 : 16} className="text-fg" />
    </button>
  );
}
