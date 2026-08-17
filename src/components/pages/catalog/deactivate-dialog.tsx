/**
 * The confirmation both catalog screens use before deactivating something.
 *
 * `DELETE /products/{id}` and `DELETE /categories/{id}` are soft deletes, and
 * that is the whole reason this dialog exists: the word "delete" would be a lie,
 * and the user's real question is "what stops working if I do this?". So the
 * consequence is the body copy, passed in by the caller — the categories screen
 * has more to say than the products one, and it says it here rather than in a
 * toast afterwards.
 */

import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { isApiError } from '@/api/errors';

export function DeactivateDialog({
  open,
  onOpenChange,
  title,
  /** What stops working. Sentences, not a single line. */
  children,
  confirmLabel = 'Nonaktifkan',
  pending = false,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  error?: unknown;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-md">{children}</div>

        {error ? (
          <Text variant="caption" tone="danger" role="alert">
            {isApiError(error) ? error.message : 'Gagal menonaktifkan.'}
          </Text>
        ) : null}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            <Text>Batal</Text>
          </Button>
          <Button variant="danger" loading={pending} onClick={onConfirm}>
            <Text>{pending ? 'Menonaktifkan…' : confirmLabel}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
