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
          'min-h-touch rounded-md border border-border bg-surface px-md py-sm type-body text-fg',
          'placeholder:text-fg-subtle',
          'outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20',
          numeric && 'type-mono tabular-nums text-right',
          invalid && 'border-danger focus:border-danger focus:ring-danger/20',
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
