/**
 * S-07 · Tambah / Edit Outlet.
 *
 * Two fields and a toggle. `POST /outlets` takes `{ name, address }` (§2.2) and
 * always returns ACTIVE, so the status toggle appears only when editing — on
 * create the outlet is born active and a toggle that says "Nonaktif" would be
 * a lie the API ignores. Address is optional: §2.4 lets the row carry none, so
 * the form does not demand one.
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { cnTextarea } from '@/components/pages/inventory/adjust-stock-dialog';
import { useCreateOutlet, useUpdateOutlet } from '@/hooks/use-outlets';
import type { Outlet } from '@/services/outlets';
import { fieldErrors } from '@/api/errors';
import { requiredString } from '@/lib/validation';
import { cn } from '@/lib/utils';

const outletFormSchema = z.object({
  name: requiredString('Nama outlet', 100),
  address: z.string().trim().max(255, 'Alamat maksimal 255 karakter'),
  active: z.boolean(),
});

type OutletFormValues = z.infer<typeof outletFormSchema>;

export function OutletDialog({
  open,
  onOpenChange,
  /** Null creates; an outlet edits it. */
  outlet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlet: Outlet | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[480px] overflow-y-auto">
        {open && (
          <OutletForm
            key={outlet?.outletId ?? 'new'}
            outlet={outlet}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OutletForm({ outlet, onDone }: { outlet: Outlet | null; onDone: () => void }) {
  const editing = outlet !== null;
  const create = useCreateOutlet();
  const update = useUpdateOutlet();
  const { toast } = useToast();

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const { control, handleSubmit, setError, formState } = useForm<OutletFormValues>({
    resolver: zodResolver(outletFormSchema),
    defaultValues: {
      name: outlet?.name ?? '',
      address: outlet?.address ?? '',
      active: outlet ? outlet.status === 'ACTIVE' : true,
    },
  });

  const applyServerErrors = (cause: unknown) => {
    const name = fieldErrors(cause).find((entry) => entry.field === 'name');
    if (name) setError('name', { message: name.message });
  };

  const submit = handleSubmit((values) => {
    const onSuccess = () => {
      toast({
        variant: 'success',
        title: editing ? 'Outlet diperbarui' : 'Outlet ditambahkan',
        description: values.name,
      });
      onDone();
    };

    if (editing) {
      update.mutate(
        {
          outletId: outlet.outletId,
          input: {
            name: values.name,
            ...(values.address ? { address: values.address } : { address: '' }),
            status: values.active ? 'ACTIVE' : 'INACTIVE',
          },
        },
        { onSuccess, onError: applyServerErrors }
      );
    } else {
      // §2.2: status is not a create field — an outlet is always born ACTIVE.
      create.mutate(
        { name: values.name, ...(values.address ? { address: values.address } : {}) },
        { onSuccess, onError: applyServerErrors }
      );
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit Outlet' : 'Tambah Outlet'}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-lg">
        <MutationErrorBanner
          error={error}
          fallback="Outlet gagal disimpan."
          handled={Object.keys(formState.errors).length > 0}
        />

        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <FormField
              label="Nama Outlet"
              htmlFor="outlet-name"
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                id="outlet-name"
                placeholder="Contoh: Outlet D - New Mall"
                disabled={pending}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="address"
          render={({ field, fieldState }) => (
            <FormField
              label="Alamat"
              htmlFor="outlet-address"
              error={fieldState.error?.message}
              hint="Alamat yang tampil di struk dan laporan."
            >
              <textarea
                {...field}
                id="outlet-address"
                rows={3}
                placeholder="Contoh: Jl. Sudirman No. 123, Jakarta"
                disabled={pending}
                aria-invalid={Boolean(fieldState.error) || undefined}
                // Same field styling as the other modals, keyed off the form's
                // own error rather than native :invalid, so focus and error read
                // identically everywhere.
                className={cn(cnTextarea(Boolean(fieldState.error)), 'min-h-[90px] resize-none')}
              />
            </FormField>
          )}
        />

        {editing && (
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <div className="flex flex-row items-center justify-between gap-md">
                <div className="flex flex-col">
                  <Label htmlFor="outlet-status">Status</Label>
                  <Text variant="caption" tone="subtle">
                    {field.value
                      ? 'Aktif — menerima transaksi baru.'
                      : 'Nonaktif — tidak menerima transaksi baru.'}
                  </Text>
                </div>
                <div className="flex flex-row items-center gap-sm">
                  <Text variant="body">{field.value ? 'Aktif' : 'Nonaktif'}</Text>
                  <Switch
                    id="outlet-status"
                    aria-label="Status outlet"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={pending}
                  />
                </div>
              </div>
            )}
          />
        )}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          <Text>Batal</Text>
        </Button>
        <Button loading={pending} onClick={() => void submit()}>
          <Text>{pending ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Tambah Outlet'}</Text>
        </Button>
      </DialogFooter>
    </>
  );
}
