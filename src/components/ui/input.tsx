import * as React from 'react';

import { cn } from '@/lib/utils';

type InputProps = React.ComponentPropsWithoutRef<'input'> & {
  /** Renders the error ring. The message itself belongs to the Field wrapper. */
  invalid?: boolean;
  /** Money and quantities: tabular figures, right-aligned. */
  numeric?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid = false, numeric = false, disabled = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          'min-h-touch rounded-md border border-border-interactive bg-surface px-md py-sm type-body text-fg',
          'placeholder:text-fg-subtle',
          // Exactly one line at a time. The resting border hides while the ring
          // is up rather than sitting inside it — transparent, not removed, so
          // the field does not resize on focus.
          'transition-colors focus:border-transparent',
          numeric && 'type-mono tabular-nums text-right',
          // Invalid shows red: as a border at rest, and as the ring itself once
          // focused. Recolouring the single ring says "here" and "wrong" at once,
          // where a red border inside an accent ring just says it twice.
          invalid ? 'border-danger focus-ring-danger' : 'focus-ring-always',
          disabled && 'bg-subtle text-fg-muted cursor-not-allowed',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
export type { InputProps };
