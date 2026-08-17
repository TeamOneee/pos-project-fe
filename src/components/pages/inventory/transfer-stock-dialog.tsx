/**
 * S-15e · Transfer Stok Antar Outlet.
 *
 * Laid out as the movement it is: a source card, an arrow, a destination card.
 * Both cards show live stock for the chosen product, and the preview strip
 * spells out the result before the user commits — a transfer is the one stock
 * operation that changes two outlets at once, and getting the direction wrong
 * is easy to do and annoying to undo.
 *
 * The source outlet is removed from the destination list: transferring to
 * itself is not a thing, and the API would only 400 on it later.
 */

import { ArrowRight, ArrowDown } from 'lucide-react';
import * as React from 'react';

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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { cnTextarea } from '@/components/pages/inventory/adjust-stock-dialog';
import type { OutletOption } from '@/components/pages/inventory/outlet-picker';
import {
  ProductSearchSelect,
  type PickedProduct,
} from '@/components/pages/inventory/product-search-select';
import { StepperInput } from '@/components/pages/inventory/stepper-input';
import { useInventoryForProduct, useTransferStock } from '@/hooks/use-inventory';
import { insufficientStockDetails, isApiError } from '@/api/errors';
import { formatCount } from '@/lib/number';

export function TransferStockDialog({
  open,
  onOpenChange,
  outlets,
  /** Pre-selects the source outlet when opened from an outlet-scoped screen. */
  defaultFromOutletId,
  defaultProduct,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlets: OutletOption[];
  defaultFromOutletId?: string | null;
  defaultProduct?: PickedProduct | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[640px] overflow-y-auto">
        {open && (
          <TransferStockForm
            outlets={outlets}
            defaultFromOutletId={defaultFromOutletId ?? null}
            defaultProduct={defaultProduct ?? null}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransferStockForm({
  outlets,
  defaultFromOutletId,
  defaultProduct,
  onDone,
}: {
  outlets: OutletOption[];
  defaultFromOutletId: string | null;
  defaultProduct: PickedProduct | null;
  onDone: () => void;
}) {
  const transfer = useTransferStock();
  const { toast } = useToast();

  const [product, setProduct] = React.useState<PickedProduct | null>(defaultProduct);
  const [fromOutletId, setFromOutletId] = React.useState<string | null>(defaultFromOutletId);
  const [toOutletId, setToOutletId] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [reason, setReason] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const from = useInventoryForProduct(fromOutletId ?? undefined, product?.productId);
  const to = useInventoryForProduct(toOutletId ?? undefined, product?.productId);

  const available = from.data?.quantity ?? 0;
  const destinationStock = to.data?.quantity ?? 0;

  const outletName = (outletId: string | null) =>
    outlets.find((outlet) => outlet.outletId === outletId)?.name ?? '';

  const shortfall = insufficientStockDetails(transfer.error)[0];
  const overdrawn = quantity > available && from.isSuccess;

  const errors = {
    product: submitted && !product ? 'Produk wajib dipilih' : undefined,
    from: submitted && !fromOutletId ? 'Outlet asal wajib dipilih' : undefined,
    to: submitted && !toOutletId ? 'Outlet tujuan wajib dipilih' : undefined,
    quantity: submitted && quantity < 1 ? 'Jumlah transfer minimal 1' : undefined,
    reason: submitted && reason.trim() === '' ? 'Alasan wajib diisi.' : undefined,
  };

  const submit = () => {
    setSubmitted(true);
    if (!product || !fromOutletId || !toOutletId || quantity < 1 || reason.trim() === '') return;

    transfer.mutate(
      {
        product_id: product.productId,
        from_outlet_id: fromOutletId,
        to_outlet_id: toOutletId,
        quantity,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          toast({
            variant: 'success',
            title: 'Stok dipindahkan',
            description: `${formatCount(quantity)} ${product.name} · ${outletName(
              fromOutletId
            )} → ${outletName(toOutletId)}`,
          });
          onDone();
        },
      }
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Transfer Stok Antar Outlet</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-lg">
        <FormField label="Produk" required error={errors.product}>
          <ProductSearchSelect
            value={product}
            onChange={setProduct}
            invalid={Boolean(errors.product)}
            disabled={transfer.isPending}
          />
        </FormField>

        {/* Source → destination. Stacks on mobile with the arrow turned down. */}
        <div className="flex flex-col items-stretch gap-md tablet:flex-row tablet:items-center">
          <OutletCard
            title="Dari Outlet"
            outlets={outlets}
            value={fromOutletId}
            onChange={(next) => {
              setFromOutletId(next);
              if (next === toOutletId) setToOutletId(null);
            }}
            caption="Stok tersedia"
            stock={available}
            loading={from.isPending && Boolean(product && fromOutletId)}
            hasProduct={Boolean(product)}
            error={errors.from}
            disabled={transfer.isPending}
          />

          <div className="flex shrink-0 items-center justify-center px-sm" aria-hidden>
            <Icon as={ArrowRight} size={24} className="hidden text-fg-muted tablet:block" />
            <Icon as={ArrowDown} size={24} className="text-fg-muted tablet:hidden" />
          </div>

          <OutletCard
            title="Ke Outlet"
            outlets={outlets.filter((outlet) => outlet.outletId !== fromOutletId)}
            value={toOutletId}
            onChange={setToOutletId}
            caption="Stok saat ini"
            stock={destinationStock}
            loading={to.isPending && Boolean(product && toOutletId)}
            hasProduct={Boolean(product)}
            error={errors.to}
            disabled={transfer.isPending}
          />
        </div>

        <FormField
          label="Jumlah Transfer"
          htmlFor="transfer-quantity"
          required
          error={errors.quantity ?? (overdrawn ? 'Jumlah melebihi stok yang tersedia.' : undefined)}
          hint={`Maks. ${formatCount(available)}`}
        >
          <div className="flex flex-col gap-sm">
            <StepperInput
              id="transfer-quantity"
              aria-label="Jumlah transfer"
              value={quantity}
              onChange={setQuantity}
              min={0}
              disabled={transfer.isPending}
              invalid={Boolean(errors.quantity) || overdrawn}
            />
            {available > 0 && (
              <button
                type="button"
                onClick={() => setQuantity(available)}
                className="min-h-touch self-start rounded-md px-sm outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Text variant="body-strong" tone="accent">
                  Transfer semua
                </Text>
              </button>
            )}
          </div>
        </FormField>

        <FormField
          label="Alasan"
          htmlFor="transfer-reason"
          required
          error={errors.reason}
          hint="Alasan wajib diisi."
        >
          <textarea
            id="transfer-reason"
            rows={2}
            value={reason}
            placeholder="Contoh: Pemerataan stok menjelang akhir pekan"
            disabled={transfer.isPending}
            aria-invalid={errors.reason ? true : undefined}
            onChange={(event) => setReason(event.target.value)}
            className={cnTextarea(Boolean(errors.reason))}
          />
        </FormField>

        {/* Live preview of both sides of the move. */}
        {product && fromOutletId && toOutletId && (
          <div className="flex flex-col gap-xs rounded-md bg-subtle p-lg">
            <Text variant="caption" tone="muted">
              Setelah transfer
            </Text>
            <PreviewLine
              outletName={outletName(fromOutletId)}
              before={available}
              after={available - quantity}
            />
            <PreviewLine
              outletName={outletName(toOutletId)}
              before={destinationStock}
              after={destinationStock + quantity}
            />
          </div>
        )}

        {shortfall ? (
          <div
            role="alert"
            className="flex flex-col gap-xs rounded-md border border-danger bg-danger-subtle p-lg"
          >
            <Text variant="body-strong" tone="danger">
              Stok di outlet asal tidak mencukupi.
            </Text>
            <Text variant="caption" tone="danger">
              {`Diminta ${formatCount(shortfall.requested)} · Tersedia ${formatCount(
                shortfall.available
              )}`}
            </Text>
          </div>
        ) : transfer.isError ? (
          <Text variant="caption" tone="danger" role="alert">
            {isApiError(transfer.error) ? transfer.error.message : 'Gagal memindahkan stok.'}
          </Text>
        ) : null}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onDone} disabled={transfer.isPending}>
          <Text>Batal</Text>
        </Button>
        <Button loading={transfer.isPending} onClick={submit}>
          <Text>{transfer.isPending ? 'Memindahkan…' : 'Transfer Stok'}</Text>
        </Button>
      </DialogFooter>
    </>
  );
}

function OutletCard({
  title,
  outlets,
  value,
  onChange,
  caption,
  stock,
  loading,
  hasProduct,
  error,
  disabled,
}: {
  title: string;
  outlets: OutletOption[];
  value: string | null;
  onChange: (outletId: string) => void;
  caption: string;
  stock: number;
  loading: boolean;
  hasProduct: boolean;
  error: string | undefined;
  disabled: boolean;
}) {
  const selectId = `transfer-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="flex flex-1 flex-col gap-sm rounded-lg border border-border bg-surface p-lg">
      <Label required htmlFor={selectId}>
        {title}
      </Label>

      <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={selectId} className="w-full" invalid={Boolean(error)}>
          <SelectValue className="type-body text-fg" placeholder="Pilih outlet" />
        </SelectTrigger>
        <SelectContent>
          {outlets.map((outlet) => (
            <SelectItem key={outlet.outletId} value={outlet.outletId}>
              {outlet.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error ? (
        <Text variant="caption" tone="danger" role="alert">
          {error}
        </Text>
      ) : !value || !hasProduct ? (
        <Text variant="caption" tone="subtle">
          {hasProduct ? 'Pilih outlet untuk melihat stok.' : 'Pilih produk lebih dulu.'}
        </Text>
      ) : loading ? (
        <Text variant="caption" tone="subtle">
          Memuat stok…
        </Text>
      ) : (
        <Text variant="caption" tone="muted">
          {caption}:{' '}
          <Text variant="body-strong" className="tabular-nums">
            {formatCount(stock)}
          </Text>
        </Text>
      )}
    </div>
  );
}

function PreviewLine({
  outletName,
  before,
  after,
}: {
  outletName: string;
  before: number;
  after: number;
}) {
  return (
    <Text variant="body-strong" className="tabular-nums">
      {`${outletName}: ${formatCount(before)} → ${formatCount(after)}`}
    </Text>
  );
}
