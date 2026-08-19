/**
 * S-09 · Tambah / Edit Staf.
 *
 * The form mirrors §1.2's two rules in both directions: a CASHIER needs an
 * outlet, an ADMIN must have none. The Role select drives the Outlet field —
 * Kasir keeps it enabled and required, Admin clears and greys it — so the API's
 * 400s on a wrong pairing never fire from this screen in normal use.
 *
 * Two deliberate departures from the brief, both because the contract does not
 * carry the field where it would need to:
 *
 *   • Password appears only on create. `PATCH /staff/:user_id` has no
 *     `password`; it has `new_password`, which is a different action — Reset
 *     Password, off the row menu.
 *   • Email is read-only when editing. `PATCH` has no `email` field either, so
 *     an editable box would be a promise the API cannot keep.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useCreateStaff, useUpdateStaff } from '@/hooks/use-staff';
import type { Outlet } from '@/services/outlets';
import type { Staff } from '@/services/staff';
import { fieldErrors } from '@/api/errors';
import { emailSchema, requiredString } from '@/lib/validation';

const OUTLET_REQUIRED_FOR_CASHIER = 'Outlet wajib dipilih untuk role Kasir.';

/** The 400 the API answers when a cashier lands on an outlet that vanished. */
const OUTLET_UNKNOWN = 'Outlet tidak ditemukan.';

function staffFormSchema(passwordRequired: boolean) {
  return z
    .object({
      name: requiredString('Nama lengkap', 100),
      email: emailSchema,
      password: z.string(),
      role: z.enum(['ADMIN', 'CASHIER'], { required_error: 'Peran wajib dipilih' }),
      outletId: z.string(),
      active: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (passwordRequired && values.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Kata sandi minimal 8 karakter',
        });
      }
      if (values.role === 'CASHIER' && !values.outletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['outletId'],
          message: OUTLET_REQUIRED_FOR_CASHIER,
        });
      }
      if (values.role === 'ADMIN' && values.outletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['outletId'],
          message: 'Admin tidak memakai outlet.',
        });
      }
    });
}

type StaffFormValues = z.infer<ReturnType<typeof staffFormSchema>>;

export function StaffDialog({
  open,
  onOpenChange,
  /** Null creates; a member edits it. */
  staff,
  /** Every outlet, so the Kasir select can list the active ones. */
  outlets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff | null;
  outlets: Outlet[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[560px] overflow-y-auto">
        {open && (
          <StaffForm
            key={staff?.userId ?? 'new'}
            staff={staff}
            outlets={outlets}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StaffForm({
  staff,
  outlets,
  onDone,
}: {
  staff: Staff | null;
  outlets: Outlet[];
  onDone: () => void;
}) {
  const editing = staff !== null;
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const { toast } = useToast();

  // §2.2: an INACTIVE outlet cannot take new staff assignments, so only active
  // outlets are selectable — the brief's "listing only active outlets".
  const activeOutlets = outlets.filter((outlet) => outlet.status === 'ACTIVE');

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const { control, handleSubmit, setError, setValue, watch, formState } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema(!editing)),
    defaultValues: {
      name: staff?.name ?? '',
      email: staff?.email ?? '',
      password: '',
      role: staff ? (staff.role === 'OWNER' ? 'CASHIER' : staff.role) : 'CASHIER',
      // A cashier whose outlet was deactivated starts empty, like an edited
      // product in a deactivated category — saving forces a valid choice.
      outletId:
        staff?.role === 'CASHIER' &&
        activeOutlets.some((outlet) => outlet.outletId === staff.outletId)
          ? (staff.outletId ?? '')
          : '',
      active: staff ? staff.status === 'ACTIVE' : true,
    },
  });

  const role = watch('role');

  // Admin works on every outlet at once; the field is cleared and locked.
  React.useEffect(() => {
    if (role === 'ADMIN') setValue('outletId', '');
  }, [role, setValue]);

  const applyServerErrors = (cause: unknown) => {
    for (const entry of fieldErrors(cause)) {
      if (entry.field === 'email')
        setError('email', { message: entry.message || 'Email sudah terdaftar.' });
      if (entry.field === 'outlet_id')
        setError('outletId', { message: entry.message || OUTLET_UNKNOWN });
      if (entry.field === 'name') setError('name', { message: entry.message });
      if (entry.field === 'password') setError('password', { message: entry.message });
    }
  };

  const submit = handleSubmit((values) => {
    const onSuccess = () => {
      toast({
        variant: 'success',
        title: editing ? 'Staf diperbarui' : 'Staf ditambahkan',
        description: values.name,
      });
      onDone();
    };

    if (editing) {
      update.mutate(
        {
          userId: staff.userId,
          input: {
            role: values.role,
            outlet_id: values.role === 'ADMIN' ? null : values.outletId,
            status: values.active ? 'ACTIVE' : 'INACTIVE',
          },
        },
        { onSuccess, onError: applyServerErrors }
      );
    } else {
      create.mutate(
        {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
          outlet_id: values.role === 'ADMIN' ? null : values.outletId,
        },
        { onSuccess, onError: applyServerErrors }
      );
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit Staf' : 'Tambah Staf'}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-lg">
        <MutationErrorBanner
          error={error}
          fallback="Staf gagal disimpan."
          handled={Object.keys(formState.errors).length > 0}
        />

        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <FormField
              label="Nama Lengkap"
              htmlFor="staff-name"
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                id="staff-name"
                placeholder="Contoh: Budi Santoso"
                disabled={pending}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <FormField
              label="Email"
              htmlFor="staff-email"
              required
              error={fieldState.error?.message}
              hint={
                editing
                  ? 'Email tidak dapat diubah setelah akun dibuat.'
                  : 'Dipakai untuk masuk ke akun.'
              }
            >
              <Input
                {...field}
                id="staff-email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                placeholder="nama@perusahaan.com"
                disabled={pending || editing}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        {!editing && (
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <FormField
                label="Password"
                htmlFor="staff-password"
                required
                error={fieldState.error?.message}
                hint="Minimal 8 karakter."
              >
                <Input
                  {...field}
                  id="staff-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={pending}
                  invalid={Boolean(fieldState.error)}
                />
              </FormField>
            )}
          />
        )}

        <Controller
          control={control}
          name="role"
          render={({ field, fieldState }) => (
            <FormField
              label="Peran"
              htmlFor="staff-role"
              required
              error={fieldState.error?.message}
              hint="Pemilik tidak dapat dibuat di sini — akun itu lahir saat pendaftaran."
            >
              <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                <SelectTrigger
                  id="staff-role"
                  className="w-full"
                  invalid={Boolean(fieldState.error)}
                >
                  <SelectValue className="type-body text-fg" placeholder="Pilih peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="CASHIER">Kasir</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="outletId"
          render={({ field, fieldState }) => {
            const isAdmin = role === 'ADMIN';
            return (
              <FormField
                label="Outlet"
                htmlFor="staff-outlet"
                required={!isAdmin}
                error={fieldState.error?.message}
                hint={
                  isAdmin
                    ? 'Admin bekerja pada seluruh outlet merchant.'
                    : 'Kasir bertugas pada tepat satu outlet.'
                }
              >
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={pending || isAdmin}
                >
                  <SelectTrigger
                    id="staff-outlet"
                    className="w-full"
                    invalid={Boolean(fieldState.error)}
                  >
                    <SelectValue className="type-body text-fg" placeholder="Pilih outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeOutlets.map((outlet) => (
                      <SelectItem key={outlet.outletId} value={outlet.outletId}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            );
          }}
        />

        {editing && (
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <div className="flex flex-row items-center justify-between gap-md">
                <div className="flex flex-col">
                  <Label htmlFor="staff-status">Status</Label>
                  <Text variant="caption" tone="subtle">
                    {field.value
                      ? 'Aktif — bisa masuk dan bertransaksi.'
                      : 'Nonaktif — tidak bisa masuk sampai diaktifkan kembali.'}
                  </Text>
                </div>
                <div className="flex flex-row items-center gap-sm">
                  <Text variant="body">{field.value ? 'Aktif' : 'Nonaktif'}</Text>
                  <Switch
                    id="staff-status"
                    aria-label="Status staf"
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
          <Text>{pending ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Tambah Staf'}</Text>
        </Button>
      </DialogFooter>
    </>
  );
}
