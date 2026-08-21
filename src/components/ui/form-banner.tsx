/** The form-level error banner: danger-subtle, at the top of the form body. */

import { AlertTriangle } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { isApiError } from '@/api/errors';
import { cn } from '@/lib/utils';

export function FormBanner({
  title,
  children,
  className,
}: {
  title: string;
  /** Optional second line: what to do about it. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex flex-row items-start gap-md rounded-md border border-danger bg-danger-subtle p-md',
        className
      )}
    >
      <Icon as={AlertTriangle} size={18} className="mt-0.5 shrink-0 text-danger" />
      <div className="flex min-w-0 flex-col gap-xs">
        <Text variant="body-strong" tone="danger">
          {title}
        </Text>
        {children}
      </div>
    </div>
  );
}

/** The banner for a rejected mutation, or null when there is nothing to report. */
export function MutationErrorBanner({
  error,
  fallback = 'Perubahan gagal disimpan.',
  /** True when the message is already shown on a field; the banner steps aside. */
  handled = false,
}: {
  error: unknown;
  fallback?: string;
  handled?: boolean;
}) {
  if (!error || handled) return null;

  return (
    <FormBanner title={isApiError(error) ? error.message : fallback}>
      <Text variant="caption" tone="muted">
        Periksa kembali data yang diisi, lalu coba simpan sekali lagi.
      </Text>
    </FormBanner>
  );
}
