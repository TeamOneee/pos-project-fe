/**
 * S-13's create/edit modal. One field, 400px wide.
 *
 * A category is a name and nothing else — `POST /categories` takes `{ name }`
 * and status is set by activating or deactivating, not by a toggle here. So the
 * modal stays the size of its content rather than padding itself out to look
 * like the product form.
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
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useCreateCategory, useUpdateCategory } from '@/hooks/use-categories';
import type { Category } from '@/services/categories';
import { fieldErrors, isApiError } from '@/api/errors';
import { requiredString } from '@/lib/validation';

const categoryFormSchema = z.object({ name: requiredString('Nama kategori', 100) });

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export function CategoryDialog({
  open,
  onOpenChange,
  /** Null creates; a category edits it. */
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        {open && (
          <CategoryForm
            key={category?.categoryId ?? 'new'}
            category={category}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const editing = category !== null;
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const { toast } = useToast();

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const { control, handleSubmit, setError } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: category?.name ?? '' },
  });

  const applyServerErrors = (cause: unknown) => {
    const name = fieldErrors(cause).find((entry) => entry.field === 'name');
    if (name) setError('name', { message: name.message });
  };

  const submit = handleSubmit((values) => {
    const onSuccess = () => {
      toast({
        variant: 'success',
        title: editing ? 'Kategori diperbarui' : 'Kategori ditambahkan',
        description: values.name,
      });
      onDone();
    };

    if (editing) {
      update.mutate(
        { categoryId: category.categoryId, input: { name: values.name } },
        { onSuccess, onError: applyServerErrors }
      );
    } else {
      create.mutate({ name: values.name }, { onSuccess, onError: applyServerErrors });
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
      </DialogHeader>

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <FormField
            label="Nama Kategori"
            htmlFor="category-name"
            required
            error={fieldState.error?.message}
          >
            <Input
              {...field}
              id="category-name"
              placeholder="Contoh: Minuman"
              autoFocus
              disabled={pending}
              invalid={Boolean(fieldState.error)}
            />
          </FormField>
        )}
      />

      {error ? (
        <Text variant="caption" tone="danger" role="alert">
          {isApiError(error) ? error.message : 'Gagal menyimpan kategori.'}
        </Text>
      ) : null}

      <DialogFooter>
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          <Text>Batal</Text>
        </Button>
        <Button loading={pending} onClick={() => void submit()}>
          <Text>{pending ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Tambah Kategori'}</Text>
        </Button>
      </DialogFooter>
    </>
  );
}
