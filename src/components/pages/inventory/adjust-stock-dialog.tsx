/**
 * S-15a · Sesuaikan Stok.
 *
 * The reason is required because the API rejects an adjustment without one
 * (400). It is not an audit note — this product has no audit trail and no
 * stock-movement history (CLAUDE.md rule 4), so the helper text says only that
 * the field is required and promises nothing about where it goes.
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
import { useAdjustInventory, useInventoryForProduct } from '@/hooks/use-inventory';
import { formatCount } from '@/lib/number';

/**
 * Everything the modal needs about the row being adjusted.
 *
 * `inventoryId` is null when the caller only knows the product and the outlet —
 * the out-of-stock alerts on S-14 carry no inventory id — and the modal looks
 * it up before it can offer a form.
 */
export type AdjustTarget = {
  inventoryId: string | null;
  productId: string;
  productName: string;
  sku: string;
  outletId: string;
  outletName: string;
  currentStock: number;
};

const adjustSchema = z.object({
  quantity: z
    .number({ required_error: 'Stok baru wajib diisi' })
    .int('Stok harus berupa angka bulat')
    .min(0, 'Stok tidak boleh bernilai negatif'),
  reason: z
    .string({ required_error: 'Alasan wajib diisi untuk penyesuaian stok manual.' })
    .trim()
    .min(1, 'Alasan wajib diisi untuk penyesuaian stok manual.')
    .max(255, 'Alasan maksimal 255 karakter'),
});

type AdjustValues = z.infer<typeof adjustSchema>;

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
        <ResolvedAdjustStock
          key={`${target.outletId}-${target.productId}`}
          target={target}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Fills in the inventory id when the caller did not have one, so the form
 * always mounts with a real current stock rather than a guess it then corrects.
 */
function ResolvedAdjustStock({ target, onDone }: { target: AdjustTarget; onDone: () => void }) {
  const needsLookup = target.inventoryId === null;
  const row = useInventoryForProduct(
    needsLookup ? target.outletId : undefined,
    needsLookup ? target.productId : undefined
  );

  const inventoryId = target.inventoryId ?? row.data?.inventoryId ?? null;
  const currentStock = target.inventoryId ? target.currentStock : (row.data?.quantity ?? 0);

  if (needsLookup && row.isPending) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Sesuaikan Stok</DialogTitle>
        </DialogHeader>
        <Text variant="body" tone="muted">
          Memuat stok saat ini…
        </Text>
      </>
    );
  }

  if (!inventoryId) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Sesuaikan Stok</DialogTitle>
        </DialogHeader>
        <Text variant="body" tone="muted">
          {`${target.productName} belum terdaftar di ${target.outletName}, jadi stoknya belum bisa disesuaikan.`}
        </Text>
        <DialogFooter>
          <Button variant="secondary" onClick={onDone}>
            <Text>Tutup</Text>
          </Button>
        </DialogFooter>
      </>
    );
  }

  return <AdjustStockForm target={{ ...target, inventoryId, currentStock }} onDone={onDone} />;
}

function AdjustStockForm({
  target,
  onDone,
}: {
  target: AdjustTarget & { inventoryId: string };
  onDone: () => void;
}) {
  const adjust = useAdjustInventory();
  const { toast } = useToast();

  const { control, handleSubmit, watch } = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { quantity: target.currentStock, reason: '' },
  });

  const quantity = watch('quantity');
  const delta = quantity - target.currentStock;

  const submit = handleSubmit((values) => {
    adjust.mutate(
      { inventoryId: target.inventoryId, input: values },
      {
        onSuccess: () => {
          toast({
            variant: 'success',
            title: 'Stok diperbarui',
            description: `${target.productName} · ${target.outletName}: ${formatCount(
              target.currentStock
            )} → ${formatCount(values.quantity)}`,
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
            {target.sku ? `${target.sku} · ` : ''}
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
              required
              error={fieldState.error?.message}
              hint="Alasan wajib diisi."
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

/** Shared by the three modals that take a reason. */
export function cnTextarea(invalid: boolean): string {
  return [
    'rounded-md border bg-surface px-md py-sm type-body text-fg placeholder:text-fg-subtle',
    'transition-colors focus-ring-always',
    invalid ? 'border-danger focus:border-danger' : 'border-border-interactive focus:border-accent',
    'disabled:bg-subtle disabled:text-fg-muted disabled:cursor-not-allowed',
  ].join(' ');
}
