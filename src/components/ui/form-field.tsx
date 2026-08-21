import * as React from 'react';

import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type FormFieldProps = {
  label: string;
  /** Message from the zod schema. Its presence is what renders the error state. */
  error?: string | undefined;
  /** Helper copy shown when there is no error. Bahasa Indonesia. */
  hint?: string;
  required?: boolean;
  className?: string;
  htmlFor?: string;
  children: React.ReactNode;
};

/** Wraps one control with its label, hint and validation message. */
function FormField({
  label,
  error,
  hint,
  required = false,
  className,
  htmlFor,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-xs', className)}>
      <Label required={required} htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
      {error ? (
        <Text variant="caption" tone="danger" role="alert" aria-live="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="subtle">
          {hint}
        </Text>
      ) : null}
    </div>
  );
}

export { FormField };
export type { FormFieldProps };
