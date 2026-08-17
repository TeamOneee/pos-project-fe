/**
 * S-12 · Tambah / Edit Produk.
 *
 * Deliberately four fields and a toggle. There is no discount field, no tax
 * field and no per-outlet price, because none of those exist in this product:
 * total equals subtotal (CLAUDE.md rule 2) and a product carries one price for
 * the whole merchant. A form that offers them would be promising arithmetic the
 * backend does not do.
 *
 * Two things the form has to say out loud:
 *
 *   • Only active categories are selectable. `POST /products` 400s on an inactive
 *     one, so the select filters them out and the helper explains why the list is
 *     shorter than the Kategori screen's.
 *   • Editing a price does not rewrite history. Old transactions keep the price
 *     they were sold at, and the banner says so — otherwise the natural reading
 *     of "edit price" is that yesterday's receipts change too.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
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
import { Icon } from '@/components/ui/icon';
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
import { useCreateProduct, useUpdateProduct } from '@/hooks/use-products';
import type { Category } from '@/services/categories';
import type { Product } from '@/services/products';
import { fieldErrors, isApiError } from '@/api/errors';
import { formatIDR } from '@/lib/money';
import { requiredString, rupiahInput } from '@/lib/validation';

/** The 400 the API answers when the category cannot take a product. */
export const INACTIVE_CATEGORY_ERROR = 'Kategori tidak aktif atau bukan milik merchant ini.';

export const PRICE_HISTORY_NOTICE =
  'Perubahan harga hanya berlaku untuk transaksi berikutnya. Riwayat transaksi lama tidak berubah.';

/**
 * The money rules live in lib/validation, but they *transform* — string in,
 * integer rupiah out. A form field has to stay the string the user is typing, so
 * the schema borrows the rules for validation and the submit handler runs the
 * same parser to get the number. One source of truth, no transform in the form.
 */
const priceRupiah = rupiahInput('Harga');

const productFormSchema = z.object({
  name: requiredString('Nama produk'),
  sku: requiredString('SKU', 64),
  categoryId: z
    .string({ required_error: 'Kategori wajib dipilih' })
    .min(1, 'Kategori wajib dipilih'),
  price: z.string().superRefine((value, ctx) => {
    const parsed = priceRupiah.safeParse(value);
    if (parsed.success) return;
    for (const issue of parsed.error.issues) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue.message });
    }
  }),
  active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export function ProductDialog({
  open,
  onOpenChange,
  /** Null creates; a product edits it. */
  product,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[560px] overflow-y-auto">
        {open && (
          // Keyed on the row so switching between two products starts clean
          // rather than carrying the previous one's values.
          <ProductForm
            key={product?.productId ?? 'new'}
            product={product}
            categories={categories}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductForm({
  product,
  categories,
  onDone,
}: {
  product: Product | null;
  categories: Category[];
  onDone: () => void;
}) {
  const editing = product !== null;
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const { toast } = useToast();

  const activeCategories = categories.filter((category) => category.status === 'ACTIVE');
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const { control, handleSubmit, setError, formState } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? '',
      sku: product?.sku ?? '',
      // An edited product may sit in a deactivated category; the field starts
      // empty in that case so saving forces a valid choice.
      categoryId:
        product?.categoryId && activeCategories.some((c) => c.categoryId === product.categoryId)
          ? product.categoryId
          : '',
      price: product ? groupThousands(String(product.price)) : '',
      active: product ? product.status === 'ACTIVE' : true,
    },
  });

  /** Maps a 400's `errors[]` onto the field that caused it. */
  const applyServerErrors = (cause: unknown) => {
    const entries = fieldErrors(cause);
    const category = entries.find((entry) => entry.field === 'category_id');
    if (category) setError('categoryId', { message: category.message || INACTIVE_CATEGORY_ERROR });

    const name = entries.find((entry) => entry.field === 'name');
    if (name) setError('name', { message: name.message });

    const sku = entries.find((entry) => entry.field === 'sku');
    if (sku) setError('sku', { message: sku.message });

    // A validation 400 with no field breakdown is still about the category on
    // this endpoint — it is the only precondition POST /products has.
    if (entries.length === 0 && isApiError(cause) && cause.kind === 'validation') {
      setError('categoryId', { message: INACTIVE_CATEGORY_ERROR });
    }
  };

  const submit = handleSubmit((values) => {
    // Guard the same rule the API enforces, so a stale category list produces a
    // field error instead of a round trip and a toast.
    if (!activeCategories.some((category) => category.categoryId === values.categoryId)) {
      setError('categoryId', { message: INACTIVE_CATEGORY_ERROR });
      return;
    }

    // Safe: the schema above rejected anything this parser would throw on.
    const price = priceRupiah.parse(values.price);

    const input = {
      name: values.name,
      sku: values.sku,
      // Integer rupiah on the way out; the contract wants a decimal string.
      price: String(price),
      category_id: values.categoryId,
      status: values.active ? ('ACTIVE' as const) : ('INACTIVE' as const),
    };

    const onSuccess = () => {
      toast({
        variant: 'success',
        title: editing ? 'Produk diperbarui' : 'Produk ditambahkan',
        description: `${values.name} · ${formatIDR(price)}`,
      });
      onDone();
    };

    if (editing) {
      update.mutate(
        { productId: product.productId, input },
        { onSuccess, onError: applyServerErrors }
      );
    } else {
      create.mutate(input, { onSuccess, onError: applyServerErrors });
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-lg">
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <FormField
              label="Nama Produk"
              htmlFor="product-name"
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                id="product-name"
                placeholder="Contoh: Coca-Cola 1.5L"
                disabled={pending}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="sku"
          render={({ field, fieldState }) => (
            <FormField
              label="SKU"
              htmlFor="product-sku"
              required
              error={fieldState.error?.message}
              hint="Kode unik produk, contoh: CC-1500"
            >
              <Input
                {...field}
                id="product-sku"
                placeholder="CC-1500"
                autoCapitalize="characters"
                disabled={pending}
                invalid={Boolean(fieldState.error)}
                className="type-mono"
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <FormField
              label="Kategori"
              htmlFor="product-category"
              required
              error={fieldState.error?.message}
              hint="Hanya kategori aktif yang dapat dipilih."
            >
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={pending}
              >
                <SelectTrigger
                  id="product-category"
                  className="w-full"
                  invalid={Boolean(fieldState.error)}
                >
                  <SelectValue className="type-body text-fg" placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.map((category) => (
                    <SelectItem key={category.categoryId} value={category.categoryId}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="price"
          render={({ field, fieldState }) => (
            <FormField
              label="Harga"
              htmlFor="product-price"
              required
              error={fieldState.error?.message}
              hint="Rupiah bulat, tanpa sen."
            >
              <div className="flex flex-row items-stretch">
                <span className="flex min-h-touch items-center rounded-l-md border border-r-0 border-border bg-subtle px-md">
                  <Text variant="body" tone="muted">
                    Rp
                  </Text>
                </span>
                <Input
                  {...field}
                  id="product-price"
                  numeric
                  inputMode="numeric"
                  placeholder="15.000"
                  disabled={pending}
                  invalid={Boolean(fieldState.error)}
                  // Grouped as the user types; the schema strips the dots again.
                  onChange={(event) => field.onChange(groupThousands(event.target.value))}
                  className="flex-1 rounded-l-none"
                />
              </div>
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <div className="flex flex-row items-center justify-between gap-md">
              <div className="flex flex-col">
                <Label htmlFor="product-status">Status</Label>
                <Text variant="caption" tone="subtle">
                  {field.value
                    ? 'Aktif — dijual di kasir.'
                    : 'Nonaktif — disimpan, tidak dijual di kasir.'}
                </Text>
              </div>
              <div className="flex flex-row items-center gap-sm">
                <Text variant="body">{field.value ? 'Aktif' : 'Nonaktif'}</Text>
                <Switch
                  id="product-status"
                  aria-label="Status produk"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={pending}
                />
              </div>
            </div>
          )}
        />

        {editing && (
          <div className="flex flex-row items-start gap-sm rounded-md border border-info bg-subtle p-lg">
            <Icon as={Info} size={18} className="mt-0.5 shrink-0 text-info" />
            <Text variant="caption" tone="muted">
              {PRICE_HISTORY_NOTICE}
            </Text>
          </div>
        )}

        {/* A failure with no field to attach to still has to be visible. */}
        {Boolean(error) && Object.keys(formState.errors).length === 0 && (
          <Text variant="caption" tone="danger" role="alert">
            {isApiError(error) ? error.message : 'Gagal menyimpan produk.'}
          </Text>
        )}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          <Text>Batal</Text>
        </Button>
        <Button loading={pending} onClick={() => void submit()}>
          <Text>{pending ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Tambah Produk'}</Text>
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Groups digits with "." as the user types: "15000" → "15.000".
 *
 * Anything that is not a digit is dropped, so a pasted "Rp 15.000,00" collapses
 * to 1500000 rather than being half-accepted — the schema then rejects it if the
 * user meant sen, which this product does not have.
 */
function groupThousands(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
