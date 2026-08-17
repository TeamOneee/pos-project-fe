/**
 * The confirmation every destructive action in the app goes through.
 *
 * `DELETE /products/{id}` and `DELETE /categories/{id}` are soft deletes, and
 * that is the whole reason this dialog exists: the word "delete" would be a lie,
 * and the user's real question is "what stops working if I do this?".
 *
 * Three things it always does, because a confirmation that skips any of them is
 * just a speed bump:
 *
 *   • It names the specific record — "Nonaktifkan Coca Cola 1.5L?", never
 *     "Nonaktifkan item ini?".
 *   • It states the consequence: what stops working, in the caller's words.
 *   • It states what survives, via `preserved`, so the user is not guessing
 *     whether they are about to lose history.
 */

import { ShieldCheck } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { MutationErrorBanner } from '@/components/ui/form-banner';
import { Icon } from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';

/** The default reassurance. Nothing in this product deletes history. */
export const HISTORY_PRESERVED = 'Riwayat transaksi tetap tersimpan.';

export function DeactivateDialog({
  open,
  onOpenChange,
  title,
  /** What stops working. Sentences, not a single line. */
  children,
  /** What survives it. Shown in its own success-toned block. */
  preserved = HISTORY_PRESERVED,
  confirmLabel = 'Nonaktifkan',
  pending = false,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  preserved?: string;
  confirmLabel?: string;
  pending?: boolean;
  error?: unknown;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tablet:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <MutationErrorBanner error={error} fallback="Gagal menonaktifkan." />

        <div className="flex flex-col gap-md">{children}</div>

        {/* What is kept, stated as plainly as what is lost. */}
        <div className="flex flex-row items-start gap-sm rounded-md bg-success-subtle p-md">
          <Icon as={ShieldCheck} size={18} className="mt-0.5 shrink-0 text-success" />
          <Text variant="caption" tone="success">
            {preserved}
          </Text>
        </div>

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
