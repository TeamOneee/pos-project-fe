import * as React from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { TABULAR_NUMS } from '@/lib/typography';
import { cn } from '@/lib/utils';

type InputProps = TextInputProps & {
  /** Renders the error ring. The message itself belongs to the Field wrapper. */
  invalid?: boolean;
  /** Money and quantities: tabular figures, right-aligned. */
  numeric?: boolean;
};

const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, invalid = false, numeric = false, editable = true, style, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        editable={editable}
        accessibilityState={{ disabled: !editable }}
        // Tabular figures cannot come from a class on native — see lib/typography.ts.
        style={numeric ? [TABULAR_NUMS, style] : style}
        className={cn(
          'min-h-touch rounded-md border border-border bg-surface px-md py-sm type-body text-fg',
          'placeholder:text-fg-subtle',
          'web:outline-none web:transition-colors web:focus:border-accent web:focus:ring-2 web:focus:ring-accent/20',
          'focus:border-accent',
          numeric && 'type-mono tabular-nums text-right',
          invalid && 'border-danger web:focus:border-danger web:focus:ring-danger/20',
          !editable && 'bg-subtle text-fg-muted web:cursor-not-allowed',
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
