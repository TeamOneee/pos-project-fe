/**
 * S-15d · Update Stok Massal.
 *
 * The wide modal, because the whole point is seeing several products' current
 * and new stock at once. Rows arrive pre-filled from a work list (the low-stock
 * screen hands over exactly what its filter is showing) or are added one at a
 * time from the catalogue.
 *
 * Partial failure is a first-class state, not an error toast. `PUT
 * /inventory/bulk` answers with the rows it actually updated, so a response
 * shorter than the request means some rows did not land — and the user needs to
 * see *which*, with the ones that succeeded left alone rather than resubmitted.
 * The retry then carries only the failures.
 */

import { Plus, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MutationErrorBanner } from '@/components/ui/form-banner';
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
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import type { OutletOption } from '@/components/pages/inventory/outlet-picker';
import {
  ProductSearchSelect,
  type PickedProduct,
} from '@/components/pages/inventory/product-search-select';
import { StockDeltaChip } from '@/components/pages/inventory/stock-delta';
import { useBulkAdjustInventory, useStockForProducts } from '@/hooks/use-inventory';
import { isApiError } from '@/api/errors';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';

/** A product the caller wants pre-loaded into the table. */
export type BulkSeedRow = { productId: string; name: string; sku: string };

type Row = {
  /** Stable across edits; the product id would collide if a row is re-added. */
  key: string;
  productId: string;
  name: string;
  sku: string;
  /** Null until the user edits it — the effective value is then current stock. */
  newQuantity: number | null;
  reason: string;
};

/** What the last submit did to each row. */
type RowOutcome = 'ok' | 'failed';

export function BulkUpdateDialog({
  open,
  onOpenChange,
  outlets,
  outletId,
  /** True when the screen already scopes the outlet, which locks the select. */
  outletLocked = false,
  seed = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlets: OutletOption[];
  outletId: string | null;
  outletLocked?: boolean;
  seed?: BulkSeedRow[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[800px] overflow-y-auto">
        {open && (
          <BulkUpdateForm
            outlets={outlets}
            initialOutletId={outletId}
            outletLocked={outletLocked}
            seed={seed}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BulkUpdateForm({
  outlets,
  initialOutletId,
  outletLocked,
  seed,
  onDone,
}: {
  outlets: OutletOption[];
  initialOutletId: string | null;
  outletLocked: boolean;
  seed: BulkSeedRow[];
  onDone: () => void;
}) {
  const bulk = useBulkAdjustInventory();
  const { toast } = useToast();

  const [outletId, setOutletId] = React.useState<string | null>(initialOutletId);
  const [rows, setRows] = React.useState<Row[]>(() =>
    seed.map((item, index) => ({
      key: `${item.productId}-${index}`,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      newQuantity: null,
      reason: '',
    }))
  );
  const [adding, setAdding] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [outcomes, setOutcomes] = React.useState<Record<string, RowOutcome> | null>(null);

  // Current stock and the inventory id each row is addressed by. Fetched per
  // row rather than carried in, because the outlet can change under them.
  const productIds = React.useMemo(() => rows.map((row) => row.productId), [rows]);
  const stock = useStockForProducts(outletId ?? undefined, productIds);

  const resolved = rows.map((row, index) => {
    const query = stock[index];
    const currentStock = query?.data?.quantity ?? 0;
    const effective = row.newQuantity ?? currentStock;

    return {
      ...row,
      inventoryId: query?.data?.inventoryId ?? null,
      loading: query?.isPending ?? false,
      currentStock,
      effective,
      delta: effective - currentStock,
      outcome: outcomes?.[row.key],
    };
  });

  const missingReason = (row: Row) => submitted && row.reason.trim() === '';
  const succeededCount = outcomes
    ? Object.values(outcomes).filter((outcome) => outcome === 'ok').length
    : 0;
  const attemptedCount = outcomes ? Object.keys(outcomes).length : 0;
  const failedRows = resolved.filter((row) => row.outcome === 'failed');

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const removeRow = (key: string) => setRows((current) => current.filter((row) => row.key !== key));

  const addRow = (product: PickedProduct) => {
    setRows((current) => [
      ...current,
      {
        key: `${product.productId}-${current.length}-${Date.now()}`,
        productId: product.productId,
        name: product.name,
        sku: product.sku,
        newQuantity: null,
        reason: '',
      },
    ]);
    setAdding(false);
  };

  /** Submits `candidates`; a retry passes only the rows that failed before. */
  const send = (candidates: typeof resolved) => {
    setSubmitted(true);
    if (!outletId || candidates.length === 0) return;
    if (candidates.some((row) => row.reason.trim() === '')) return;

    const items = candidates.flatMap((row) =>
      row.inventoryId
        ? [{ inventory_id: row.inventoryId, quantity: row.effective, reason: row.reason.trim() }]
        : []
    );

    bulk.mutate(
      { outlet_id: outletId, items },
      {
        onSuccess: (updated) => {
          const landed = new Set(updated.map((item) => item.inventoryId));
          const next: Record<string, RowOutcome> = { ...(outcomes ?? {}) };

          candidates.forEach((row) => {
            next[row.key] = row.inventoryId && landed.has(row.inventoryId) ? 'ok' : 'failed';
          });

          const failures = candidates.filter((row) => next[row.key] === 'failed');

          if (failures.length === 0) {
            toast({
              variant: 'success',
              title: 'Stok diperbarui',
              description: `${formatCount(candidates.length)} produk berhasil diperbarui.`,
            });
            onDone();
            return;
          }

          setOutcomes(next);
        },
        // A thrown 400 rejects the whole batch: nothing landed, so every
        // candidate is a failure and the banner reads 0 of N.
        onError: () => {
          const next: Record<string, RowOutcome> = { ...(outcomes ?? {}) };
          candidates.forEach((row) => {
            next[row.key] = 'failed';
          });
          setOutcomes(next);
        },
      }
    );
  };

  const retrying = failedRows.length > 0;
  const candidates = retrying ? failedRows : resolved;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Update Stok Massal</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-lg">
        {/* A batch that was rejected outright reports at the top; per-row
            failures report on their own rows, under the partial-result banner. */}
        <MutationErrorBanner
          error={bulk.error}
          fallback="Update massal gagal disimpan."
          handled={outcomes !== null}
        />

        {outcomes && attemptedCount > 0 && (
          <div
            role="alert"
            className={cn(
              'rounded-md border p-lg',
              succeededCount === attemptedCount
                ? 'border-success bg-success-subtle'
                : 'border-warning bg-warning-subtle'
            )}
          >
            <Text
              variant="body-strong"
              tone={succeededCount === attemptedCount ? 'success' : 'warning'}
            >
              {`${formatCount(succeededCount)} dari ${formatCount(
                attemptedCount
              )} produk berhasil diperbarui.`}
            </Text>
          </div>
        )}

        <div className="flex flex-col gap-xs">
          <Label required htmlFor="bulk-outlet">
            Outlet
          </Label>
          <Select
            value={outletId ?? undefined}
            onValueChange={setOutletId}
            disabled={outletLocked || bulk.isPending}
          >
            <SelectTrigger
              id="bulk-outlet"
              className="w-full tablet:max-w-[320px]"
              invalid={submitted && !outletId}
            >
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
          {submitted && !outletId ? (
            <Text variant="caption" tone="danger" role="alert">
              Outlet wajib dipilih
            </Text>
          ) : outletLocked ? (
            <Text variant="caption" tone="subtle">
              Outlet mengikuti halaman yang sedang dibuka.
            </Text>
          ) : null}
        </div>

        <div className="flex flex-col">
          {/* Column heads; the rows below stack into cards on mobile. */}
          <div className="hidden flex-row gap-md border-b border-border pb-sm tablet:flex">
            <HeadCell className="flex-[3]">Produk</HeadCell>
            <HeadCell className="flex-1 justify-end">Stok Saat Ini</HeadCell>
            <HeadCell className="flex-[2]">Stok Baru</HeadCell>
            <HeadCell className="flex-1">Perubahan</HeadCell>
            <HeadCell className="flex-[2]">Alasan</HeadCell>
            <span className="w-touch shrink-0" />
          </div>

          {resolved.length === 0 ? (
            <div className="py-xl">
              <Text variant="body" tone="muted">
                Belum ada produk. Tambahkan produk untuk mulai memperbarui stok.
              </Text>
            </div>
          ) : (
            resolved.map((row) => (
              <div
                key={row.key}
                className={cn(
                  'flex flex-col gap-sm border-b border-border py-md tablet:flex-row tablet:items-start tablet:gap-md',
                  row.outcome === 'failed' && 'bg-danger-subtle'
                )}
              >
                <div className="flex min-w-0 flex-col tablet:flex-[3]">
                  <Text variant="body-strong" className="truncate">
                    {row.name}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {row.sku}
                  </Text>
                </div>

                <div className="flex flex-row items-center justify-between gap-sm tablet:flex-1 tablet:justify-end">
                  <Text variant="caption" tone="subtle" className="tablet:hidden">
                    Stok Saat Ini
                  </Text>
                  <Text variant="mono" tone="muted">
                    {row.loading ? '…' : formatCount(row.currentStock)}
                  </Text>
                </div>

                <div className="tablet:flex-[2]">
                  <Input
                    numeric
                    inputMode="numeric"
                    aria-label={`Stok baru ${row.name}`}
                    disabled={bulk.isPending || row.outcome === 'ok'}
                    value={String(row.effective)}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/[^\d]/g, '');
                      updateRow(row.key, { newQuantity: digits === '' ? 0 : Number(digits) });
                    }}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-row items-center justify-between gap-sm tablet:flex-1">
                  <Text variant="caption" tone="subtle" className="tablet:hidden">
                    Perubahan
                  </Text>
                  <StockDeltaChip delta={row.delta} label={`Perubahan ${row.name}`} />
                </div>

                <div className="flex flex-col gap-xs tablet:flex-[2]">
                  <Input
                    aria-label={`Alasan ${row.name}`}
                    placeholder="Alasan"
                    disabled={bulk.isPending || row.outcome === 'ok'}
                    invalid={missingReason(row)}
                    value={row.reason}
                    onChange={(event) => updateRow(row.key, { reason: event.target.value })}
                    className="w-full"
                  />
                  {missingReason(row) && (
                    <Text variant="caption" tone="danger" role="alert">
                      Alasan wajib diisi.
                    </Text>
                  )}
                  {row.outcome === 'failed' && (
                    <Text variant="caption" tone="danger" role="alert">
                      {rowFailureMessage(row.inventoryId, bulk.error)}
                    </Text>
                  )}
                  {row.outcome === 'ok' && (
                    <Text variant="caption" tone="success">
                      Berhasil diperbarui.
                    </Text>
                  )}
                </div>

                <button
                  type="button"
                  aria-label={`Hapus ${row.name} dari daftar`}
                  disabled={bulk.isPending}
                  onClick={() => removeRow(row.key)}
                  className="flex h-touch w-touch shrink-0 items-center justify-center self-end rounded-md outline-none hover:bg-subtle focus-ring disabled:opacity-50 tablet:self-start"
                >
                  <Icon as={X} size={16} className="text-fg-muted" />
                </button>
              </div>
            ))
          )}

          {adding ? (
            <div className="border-b border-border py-md">
              <ProductSearchSelect
                value={null}
                autoFocus
                excludeIds={productIds}
                onChange={(product) => {
                  if (product) addRow(product);
                }}
              />
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="mt-sm min-h-touch rounded-md px-sm outline-none hover:bg-subtle focus-ring"
              >
                <Text variant="body" tone="muted">
                  Batal tambah produk
                </Text>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              disabled={bulk.isPending}
              className="flex min-h-touch flex-row items-center gap-sm border-b border-border px-sm outline-none hover:bg-subtle focus-ring disabled:opacity-50"
            >
              <Icon as={Plus} size={16} className="text-accent" />
              <Text variant="body-strong" tone="accent">
                Tambah Produk
              </Text>
            </button>
          )}
        </div>
      </div>

      <DialogFooter className="tablet:items-center tablet:justify-between">
        <Text variant="body-strong">
          {`${formatCount(candidates.length)} produk akan diperbarui`}
        </Text>

        <div className="flex flex-col-reverse gap-md tablet:flex-row">
          <Button variant="secondary" onClick={onDone} disabled={bulk.isPending}>
            <Text>{retrying ? 'Tutup' : 'Batal'}</Text>
          </Button>
          <Button
            loading={bulk.isPending}
            disabled={candidates.length === 0}
            onClick={() => send(candidates)}
          >
            <Text>{bulk.isPending ? 'Menyimpan…' : retrying ? 'Coba Lagi' : 'Simpan Semua'}</Text>
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

/**
 * The contract does not define per-item errors on the bulk response — a row is
 * simply absent from it. When the request failed outright its message is the
 * best explanation available; otherwise the row was silently skipped, which
 * happens when the inventory row no longer exists at that outlet.
 */
function rowFailureMessage(inventoryId: string | null, error: unknown): string {
  if (!inventoryId) return 'Produk ini belum terdaftar di outlet yang dipilih.';
  if (isApiError(error)) return error.message;
  return 'Gagal diperbarui. Periksa nilainya lalu coba lagi.';
}

function HeadCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex', className)}>
      <Text variant="caption" tone="subtle">
        {children}
      </Text>
    </div>
  );
}
