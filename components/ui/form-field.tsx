import * as React from 'react';
import { View } from 'react-native';

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
  children: React.ReactNode;
};

/**
 * Wraps one control with its label, hint and validation message. Pair with
 * react-hook-form's Controller; the zod schema owns the message text.
 *
 * The error is text, never a colour alone (CLAUDE.md rule 6).
 */
function FormField({ label, error, hint, required = false, className, children }: FormFieldProps) {
  return (
    <View className={cn('gap-xs', className)}>
      <Label required={required}>{label}</Label>
      {children}
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite" role="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="subtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export { FormField };
export type { FormFieldProps };
