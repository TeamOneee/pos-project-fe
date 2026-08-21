/**
 * S-15a · Sesuaikan Stok.
 *
 * The reason is optional in this form. §4.2 still rejects an adjustment without
 * one (400), so leaving it blank saves the delta and surfaces the server's
 * error rather than pre-empting it with a field error.
 *
 * The cashier-facing shape of this form is "what should the stock be", but the
 * API takes "how much should it change by": `POST /inventory/adjustments` sends
 * a signed `delta` and the server computes the result itself (§4.2). So the
 * form collects a target quantity and submits the difference, which also makes
 * the contract's "delta must not be zero" rule a natural piece of validation —
 * saving a row without changing it is not an adjustment.
 *
 * Addressing is by `(outlet_id, product_id)`, so unlike the previous contract
 * there is no inventory-row id to look up first, and a product with no stock
 * row at the outlet can be adjusted straight into existence.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { MutationErrorBanner } from '@/components/ui/form-banner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { StockDeltaChip } from '@/components/pages/inventory/stock-delta';
import { StepperInput } from '@/components/pages/inventory/stepper-input';
import { useAdjustStock } from '@/hooks/use-inventory';
import { formatCount } from '@/lib/number';
import { optionalText } from '@/lib/validation';

/** Everything the modal needs about the row being adjusted. */
export type AdjustTarget = {
  productId: string;
  productName: string;
  outletId: string;
  outletName: string;
  currentStock: number;
};

function adjustSchema(currentStock: number) {
  return z.object({
    quantity: z
      .number({ required_error: 'Stok baru wajib diisi' })
      .int('Stok harus berupa angka bulat')
      .min(0, 'Stok tidak boleh bernilai negatif')
      // §4.2: `delta` may not be zero, so an unchanged quantity is not a
      // submittable adjustment. Caught here rather than as a 400.
      .refine((value) => value !== currentStock, 'Stok baru harus berbeda dari stok saat ini'),
    reason: optionalText('Alasan').optional(),
  });
}

type AdjustValues = { quantity: number; reason: string };

export function AdjustStockDialog({
  target,
  open,
  onOpenChange,
}: {
  /** Null while nothing is being adjusted; the dialog renders nothing. */
  target: AdjustTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        {/* Keyed on the row, so reopening on a different product starts clean. */}
        <AdjustStockForm
          key={`${target.outletId}-${target.productId}`}
          target={target}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AdjustStockForm({ target, onDone }: { target: AdjustTarget; onDone: () => void }) {
  const adjust = useAdjustStock();
  const { toast } = useToast();

  const { control, handleSubmit, watch } = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema(target.currentStock)),
    defaultValues: { quantity: target.currentStock, reason: '' },
  });

  const quantity = watch('quantity');
  const delta = quantity - target.currentStock;

  const submit = handleSubmit((values) => {
    adjust.mutate(
      {
        outlet_id: target.outletId,
        product_id: target.productId,
        // The signed difference, which is what the endpoint actually takes.
        delta: values.quantity - target.currentStock,
        reason: values.reason,
      },
      {
        onSuccess: (result) => {
          toast({
            variant: 'success',
            title: 'Stok diperbarui',
            description: `${target.productName} · ${target.outletName}: ${formatCount(
              result.quantityBefore
            )} → ${formatCount(result.quantityAfter)}`,
          });
          onDone();
        },
      }
    );
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Sesuaikan Stok</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-lg">
        <MutationErrorBanner error={adjust.error} fallback="Perubahan stok gagal disimpan." />

        {/* Read-only summary: which product, at which outlet. */}
        <div className="flex flex-col gap-xs rounded-md bg-subtle p-lg">
          <Text variant="h3">{target.productName}</Text>
          <Text variant="caption" tone="muted">
            {target.outletName}
          </Text>
        </div>

        <div className="flex flex-row items-baseline justify-between gap-md">
          <Text variant="body" tone="muted">
            Stok Saat Ini
          </Text>
          <Text variant="display" className="tabular-nums">
            {formatCount(target.currentStock)}
          </Text>
        </div>

        <Controller
          control={control}
          name="quantity"
          render={({ field, fieldState }) => (
            <FormField
              label="Stok Baru"
              htmlFor="adjust-quantity"
              required
              error={fieldState.error?.message}
            >
              <StepperInput
                id="adjust-quantity"
                aria-label="Stok baru"
                value={field.value}
                onChange={field.onChange}
                min={0}
                disabled={adjust.isPending}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <div className="flex flex-row items-center gap-sm">
          <Text variant="label" tone="muted">
            Perubahan
          </Text>
          <StockDeltaChip delta={delta} label="Perubahan" />
        </div>

        <Controller
          control={control}
          name="reason"
          render={({ field, fieldState }) => (
            <FormField
              label="Alasan"
              htmlFor="adjust-reason"
              error={fieldState.error?.message}
              hint="Opsional."
            >
              <textarea
                {...field}
                id="adjust-reason"
                rows={2}
                placeholder="Contoh: Restock dari supplier"
                disabled={adjust.isPending}
                aria-invalid={fieldState.error ? true : undefined}
                className={cnTextarea(Boolean(fieldState.error))}
              />
            </FormField>
          )}
        />
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onDone} disabled={adjust.isPending}>
          <Text>Batal</Text>
        </Button>
        <Button loading={adjust.isPending} onClick={() => void submit()}>
          <Text>{adjust.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}</Text>
        </Button>
      </DialogFooter>
    </>
  );
}

/** Shared by the modals that take a reason. */
export function cnTextarea(invalid: boolean): string {
  return [
    'rounded-md border bg-surface px-md py-sm type-body text-fg placeholder:text-fg-subtle',
    // One line at a time: the resting border hides under the ring, and an
    // invalid field recolours the ring rather than keeping a second border.
    'transition-colors focus:border-transparent',
    invalid ? 'border-danger focus-ring-danger' : 'border-border-interactive focus-ring-always',
    'disabled:bg-subtle disabled:text-fg-muted disabled:cursor-not-allowed',
  ].join(' ');
}
