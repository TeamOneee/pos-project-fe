/**
 * S-02 · Register — merchant and its first Owner in one submission.
 *
 * `POST /auth/register` returns a token, so the form signs in with it and
 * routes straight to the dashboard.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { FormBanner } from '@/components/ui/form-banner';
import { useRegister } from '@/hooks/use-auth';
import { isApiError, isDuplicateEmail } from '@/api/errors';

const registerSchema = z
  .object({
    merchantName: z
      .string({ required_error: 'Nama merchant wajib diisi' })
      .trim()
      .min(1, 'Nama merchant wajib diisi')
      .max(255, 'Nama merchant maksimal 255 karakter'),
    name: z
      .string({ required_error: 'Nama lengkap wajib diisi' })
      .trim()
      .min(1, 'Nama lengkap wajib diisi')
      .max(255, 'Nama lengkap maksimal 255 karakter'),
    email: z
      .string({ required_error: 'Email wajib diisi' })
      .trim()
      .min(1, 'Email wajib diisi')
      .email('Format email tidak valid'),
    password: z
      .string({ required_error: 'Kata sandi wajib diisi' })
      .min(8, 'Kata sandi minimal 8 karakter'),
    confirmPassword: z.string({ required_error: 'Konfirmasi kata sandi wajib diisi' }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const navigate = useNavigate();
  const register = useRegister();
  const { toast } = useToast();

  const { control, handleSubmit, setError } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      merchantName: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const submit = handleSubmit((values) => {
    register.mutate(
      {
        // §1.2 takes a flat body, and creates the merchant and its OWNER in one
        // atomic call.
        name: values.name,
        email: values.email,
        password: values.password,
        merchant_name: values.merchantName,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Merchant berhasil dibuat',
            description: 'Silakan masuk dengan email dan kata sandi Anda.',
            variant: 'success',
          });
          // §1.2 issues no token on register, so the new Owner signs in.
          navigate('/login', { replace: true });
        },
        onError: (error) => {
          // A taken email is a field problem, so it is shown on the field as
          // well as in the banner. Nothing is being concealed here, unlike login.
          if (isDuplicateEmail(error)) {
            setError('email', { message: 'Email ini sudah terdaftar.' });
          }
        },
      }
    );
  });

  return (
    <div className="flex flex-col gap-xl pt-10 lg:pt-0">
      {/* Desktop only — header above form (hidden on mobile by request) */}
      <div className="hidden flex-col gap-xs desktop:flex">
        <Text variant="h1">Daftarkan bisnis Anda</Text>
        <Text variant="body" tone="muted">
          Akun pertama otomatis menjadi Owner.
        </Text>
      </div>

      <div className="flex flex-col gap-lg">
        {bannerFor(register.error) && <FormBanner title={bannerFor(register.error) ?? ''} />}

        <Text variant="label" tone="muted" className="uppercase">
          Data Bisnis
        </Text>

        <Controller
          control={control}
          name="merchantName"
          render={({ field, fieldState }) => (
            <FormField label="Nama Merchant" error={fieldState.error?.message} required>
              <Input
                {...field}
                value={field.value}
                placeholder="Toko Sejahtera"
                disabled={register.isPending}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <Separator />

        <Text variant="label" tone="muted" className="uppercase">
          Akun Owner
        </Text>

        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <FormField label="Nama Lengkap" error={fieldState.error?.message} required>
              <Input
                {...field}
                value={field.value}
                placeholder="John Doe"
                autoComplete="name"
                disabled={register.isPending}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

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
                disabled={register.isPending}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <FormField
              label="Kata sandi"
              error={fieldState.error?.message}
              hint="Minimal 8 karakter"
              required
            >
              <Input
                {...field}
                value={field.value}
                type="password"
                autoComplete="new-password"
                disabled={register.isPending}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <FormField label="Konfirmasi Kata Sandi" error={fieldState.error?.message} required>
              <Input
                {...field}
                value={field.value}
                type="password"
                autoComplete="new-password"
                disabled={register.isPending}
                invalid={Boolean(fieldState.error)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
              />
            </FormField>
          )}
        />

        <Button size="lg" loading={register.isPending} onClick={() => void submit()}>
          <Text>{register.isPending ? 'Memproses…' : 'Buat Akun & Merchant'}</Text>
        </Button>
      </div>

      <div className="hidden flex-row justify-center gap-xs desktop:flex">
        <Text variant="body" tone="muted">
          Sudah punya akun?
        </Text>
        <Link to="/login">
          <Text variant="body-strong" tone="accent">
            Masuk
          </Text>
        </Link>
      </div>
    </div>
  );
}

function bannerFor(error: unknown): string | null {
  if (!isApiError(error)) return null;

  if (isDuplicateEmail(error)) return 'Email ini sudah terdaftar. Gunakan email lain atau masuk.';
  if (error.kind === 'validation') return error.message;
  if (error.kind === 'timeout' || error.kind === 'network') {
    return 'Tidak dapat terhubung ke server. Periksa koneksi Anda.';
  }

  return 'Terjadi kesalahan. Coba lagi sebentar lagi.';
}
