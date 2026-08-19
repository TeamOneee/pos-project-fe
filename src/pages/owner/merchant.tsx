/**
 * S-10 · Pengaturan Merchant.
 *
 * A narrow single-column page (§7.3). `name` is the only editable field —
 * §2.4 `MerchantDto` carries no low-stock threshold, so the brief's second card
 * ("Konfigurasi Stok") has nothing to configure and is left out rather than
 * faking a setting that would have to be persisted somewhere the contract does
 * not have.
 *
 * The route demands `merchant` read, which the matrix grants only to the Owner,
 * so the form is the whole screen — there is no read-only variant to render.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { MutationErrorBanner } from '@/components/ui/form-banner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useMerchant, useUpdateMerchant } from '@/hooks/use-merchant';
import { formatDate } from '@/lib/date';
import { requiredString } from '@/lib/validation';

const merchantFormSchema = z.object({ name: requiredString('Nama merchant', 100) });
type MerchantFormValues = z.infer<typeof merchantFormSchema>;

export default function MerchantPage() {
  const merchant = useMerchant();
  const update = useUpdateMerchant();
  const { toast } = useToast();

  const { control, handleSubmit, reset, formState } = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantFormSchema),
    defaultValues: { name: '' },
  });

  // The query is the source of truth; a refetch (or the PATCH response) moves
  // the field, and "Batal" restores it.
  React.useEffect(() => {
    if (merchant.data) reset({ name: merchant.data.name });
  }, [merchant.data, reset]);

  const submit = handleSubmit((values) => {
    update.mutate(
      { name: values.name },
      {
        onSuccess: (saved) => {
          toast({
            variant: 'success',
            title: 'Profil merchant diperbarui',
            description: saved.name,
          });
          reset({ name: saved.name });
        },
      }
    );
  });

  const dirty = merchant.data ? formState.isDirty : false;

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[720px]">
      <Text variant="h1">Pengaturan Merchant</Text>

      {merchant.isPending ? (
        <Skeleton className="h-[280px] w-full" />
      ) : merchant.isError ? (
        <div className="flex items-center justify-center py-3xl">
          <Text variant="body" tone="danger">
            Gagal memuat profil merchant.
          </Text>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-lg pt-lg">
            <div className="flex flex-col gap-xs">
              <Text variant="h2">Informasi Merchant</Text>
              <Text variant="body" tone="muted">
                Nama ini tampil di header aplikasi dan di struk.
              </Text>
            </div>

            <MutationErrorBanner
              error={update.error}
              fallback="Profil merchant gagal disimpan."
              handled={Object.keys(formState.errors).length > 0}
            />

            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <FormField
                  label="Nama Merchant"
                  htmlFor="merchant-name"
                  required
                  error={fieldState.error?.message}
                >
                  <Input
                    {...field}
                    id="merchant-name"
                    placeholder="Nama usaha Anda"
                    disabled={update.isPending}
                    invalid={Boolean(fieldState.error)}
                  />
                </FormField>
              )}
            />

            <Text variant="caption" tone="muted">
              {merchant.data?.createdAt
                ? `Dibuat pada ${formatDate(merchant.data.createdAt)}`
                : 'Dibuat pada —'}
            </Text>
          </CardContent>

          <CardFooter className="sticky bottom-0 justify-end">
            <Button
              variant="ghost"
              onClick={() => reset({ name: merchant.data.name })}
              disabled={update.isPending || !dirty}
            >
              <Text>Batal</Text>
            </Button>
            <Button loading={update.isPending} disabled={!dirty} onClick={() => void submit()}>
              <Text>{update.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}</Text>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
