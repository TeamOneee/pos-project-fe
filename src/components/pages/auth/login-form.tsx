/**
 * S-01 · Login.
 *
 * The security-relevant detail: a rejected sign-in never says which field was
 * wrong. The API answers 401 for both "no such email" and "wrong password", and
 * this form keeps it that way — one banner, both inputs in the error state, no
 * field-level message.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { DevRoleLogin } from '@/components/pages/auth/dev-role-login';
import { FormBanner } from '@/components/ui/form-banner';
import { isMockMode } from '@/api/config';
import { presentLoginError } from '@/lib/login-error';
import { useLogin } from '@/hooks/use-auth';
import { landingRoute } from '@/lib/permissions';

/** One schema per form, colocated with it (CLAUDE.md § Stack). */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email wajib diisi' })
    .trim()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  password: z.string({ required_error: 'Kata sandi wajib diisi' }).min(1, 'Kata sandi wajib diisi'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const login = useLogin();
  const [visible, setVisible] = React.useState(false);

  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: (result) => navigate(landingRoute(result.role), { replace: true }),
    });
  });

  // A rejected credential taints both fields, never one — see login-error.ts.
  const { banner, markFieldsInvalid } = presentLoginError(login.error);

  return (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-col gap-xs">
        <Text variant="h1">Masuk ke akun Anda</Text>
        <Text variant="body" tone="muted">
          Gunakan email yang terdaftar pada merchant Anda.
        </Text>
      </div>

      <div className="flex flex-col gap-lg">
        {banner && <FormBanner title={banner} />}

        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <FormField label="Email" error={fieldState.error?.message} required>
              <Input
                {...field}
                value={field.value}
                placeholder="nama@bisnis.com"
                type="email"
                autoComplete="email"
                disabled={login.isPending}
                invalid={Boolean(fieldState.error) || markFieldsInvalid}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <FormField label="Kata sandi" error={fieldState.error?.message} required>
              <div className="relative">
                <Input
                  {...field}
                  value={field.value}
                  placeholder="••••••••"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={login.isPending}
                  invalid={Boolean(fieldState.error) || markFieldsInvalid}
                  className="w-full pr-touch"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submit();
                  }}
                />
                <button
                  aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  onClick={() => setVisible((value) => !value)}
                  type="button"
                  className="absolute right-0 top-0 flex h-touch w-touch items-center justify-center"
                >
                  <Icon as={visible ? EyeOff : Eye} size={18} className="text-fg-muted" />
                </button>
              </div>
            </FormField>
          )}
        />

        <Button
          size="lg"
          loading={login.isPending}
          disabled={formState.isSubmitting}
          onClick={() => void submit()}
        >
          <Text>{login.isPending ? 'Memproses…' : 'Masuk'}</Text>
        </Button>
      </div>

      <div className="flex flex-row justify-center gap-xs">
        <Text variant="body" tone="muted">
          Belum punya akun merchant?
        </Text>
        <Link to="/register">
          <Text variant="body-strong" tone="accent">
            Daftar di sini
          </Text>
        </Link>
      </div>

      {isMockMode() && (
        <>
          <Separator />
          <DevRoleLogin />
        </>
      )}
    </div>
  );
}
