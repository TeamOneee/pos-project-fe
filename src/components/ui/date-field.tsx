/** A labelled day input. */

import * as React from 'react';

import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

export type DateFieldProps = {
  label: string;
  /** `YYYY-MM-DD`, or empty while unset. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  /** `YYYY-MM-DD` bounds handed to the native picker, so it steers before validation has to. */
  min?: string;
  max?: string;
  /** Presence renders the error state; the message is the caller's copy. */
  error?: string;
  className?: string;
};

export function DateField({
  label,
  value,
  onChange,
  id,
  min,
  max,
  error,
  className,
}: DateFieldProps) {
  const generated = React.useId();
  const inputId = id ?? generated;

  return (
    <FormField label={label} htmlFor={inputId} error={error} className={className}>
      <Input
        id={inputId}
        type="date"
        // Duplicated on the control itself rather than left to the <label for>: the accessible-name
        // audit in src/test resolves names from ARIA and text content only, and does not follow the
        // label association.
        aria-label={label}
        value={value}
        min={min}
        max={max}
        invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}
