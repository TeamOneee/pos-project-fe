/**
 * The row-menu action that sets a new password for one staff member.
 *
 * §1.2 has no way to set an initial or new password except `new_password` on
 * `PATCH /staff/:user_id`, and it is deliberately separate from the edit dialog:
 * changing someone's password is not an edit to their details, it is a
 * credential reset — the confirmation wording below says what it does to their
 * current sessions.
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
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useUpdateStaff } from '@/hooks/use-staff';
import type { Staff } from '@/services/staff';
import { fieldErrors } from '@/api/errors';
import { passwordSchema } from '@/lib/validation';

const resetSchema = z.object({ password: passwordSchema });
type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Staff | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        {open && member && (
          <ResetForm key={member.userId} member={member} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResetForm({ member, onDone }: { member: Staff; onDone: () => void }) {
  const update = useUpdateStaff();
  const { toast } = useToast();

  const { control, handleSubmit, setError } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '' },
  });

  const submit = handleSubmit((values) => {
    update.mutate(
      { userId: member.userId, input: { new_password: values.password } },
      {
        onSuccess: () => {
          toast({
            variant: 'success',
            title: 'Password direset',
            description: `${member.name} dapat masuk dengan password baru.`,
          });
          onDone();
        },
        onError: (cause) => {
          const entry = fieldErrors(cause).find((e) => e.field === 'new_password');
          if (entry) setError('password', { message: entry.message });
        },
      }
    );
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Reset Password</DialogTitle>
      </DialogHeader>

      <MutationErrorBanner error={update.error} fallback="Password gagal direset." />

      <Text variant="body" tone="muted">
        Password {member.name} akan diganti. Sesi yang sedang berjalan akan diminta masuk lagi
        dengan password baru.
      </Text>

      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <FormField
            label="Password Baru"
            htmlFor="reset-password"
            required
            error={fieldState.error?.message}
            hint="Minimal 8 karakter."
          >
            <Input
              {...field}
              id="reset-password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              disabled={update.isPending}
              invalid={Boolean(fieldState.error)}
            />
          </FormField>
        )}
      />

      <DialogFooter>
        <Button variant="secondary" onClick={onDone} disabled={update.isPending}>
          <Text>Batal</Text>
        </Button>
        <Button loading={update.isPending} onClick={() => void submit()}>
          <Text>{update.isPending ? 'Menyimpan…' : 'Simpan'}</Text>
        </Button>
      </DialogFooter>
    </>
  );
}
