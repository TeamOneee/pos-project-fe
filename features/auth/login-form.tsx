/**
 * S-01 · Login.
 *
 * The security-relevant detail: a rejected sign-in never says which field was
 * wrong. The API answers 401 for both "no such email" and "wrong password", and
 * this form keeps it that way — one banner, both inputs in the error state, no
 * field-level message. Anything finer would confirm which emails are registered.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { FormBanner } from '@/features/auth/form-banner';
import { presentLoginError } from '@/features/auth/login-error';
import { useLogin } from '@/hooks/use-auth';
import { landingRoute } from '@/lib/auth/permissions';

/** One schema per form, colocated with it (CLAUDE.md § Stack). */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email wajib diisi' })
    .trim()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  password: z
    .string({ required_error: 'Kata sandi wajib diisi' })
    .min(1, 'Kata sandi wajib diisi'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const [visible, setVisible] = React.useState(false);

  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: (result) => router.replace(landingRoute(result.user.role) as never),
    });
  });

  // A rejected credential taints both fields, never one — see login-error.ts.
  const { banner, markFieldsInvalid } = presentLoginError(login.error);

  return (
    <View className="gap-xl">
      <View className="gap-xs">
        <Text variant="h1">Masuk ke akun Anda</Text>
        <Text variant="body" tone="muted">
          Gunakan email yang terdaftar pada merchant Anda.
        </Text>
      </View>

      <View className="gap-lg">
        {banner && <FormBanner message={banner} />}

        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <FormField label="Email" error={fieldState.error?.message} required>
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="nama@bisnis.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={!login.isPending}
                invalid={Boolean(fieldState.error) || markFieldsInvalid}
                onSubmitEditing={() => void submit()}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <FormField label="Kata sandi" error={fieldState.error?.message} required>
              <View className="justify-center">
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="••••••••"
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  editable={!login.isPending}
                  invalid={Boolean(fieldState.error) || markFieldsInvalid}
                  className="pr-touch"
                  onSubmitEditing={() => void submit()}
                />
                <Pressable
                  accessibilityLabel={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  onPress={() => setVisible((value) => !value)}
                  className="absolute right-0 h-touch w-touch items-center justify-center"
                >
                  <Icon as={visible ? EyeOff : Eye} size={18} className="text-fg-muted" />
                </Pressable>
              </View>
            </FormField>
          )}
        />

        <Button
          size="lg"
          loading={login.isPending}
          disabled={formState.isSubmitting}
          onPress={() => void submit()}
        >
          <Text>{login.isPending ? 'Memproses…' : 'Masuk'}</Text>
        </Button>
      </View>

      <View className="flex-row justify-center gap-xs">
        <Text variant="body" tone="muted">
          Belum punya akun merchant?
        </Text>
        <Link href="/register">
          <Text variant="body-strong" tone="accent">
            Daftar di sini
          </Text>
        </Link>
      </View>
    </View>
  );
}
