/**
 * S-15's data table.
 *
 * Two variants of one table. The Admin's has an action column; the Owner's does
 * not render one at all — the buttons are absent from the DOM rather than
 * hidden, because a read-only screen that merely looks read-only is not one.
 *
 * Below tablet the table becomes stacked cards (brief §7.3): the product stays
 * the identifier and everything else becomes a labelled line. A table that
 * scrolls sideways on a phone is not a table anyone reads.
 *
 * Two columns the previous contract fed are gone, because §4.4 `InventoryDto`
 * carries neither: the product's **SKU** (no such field exists anywhere in this
 * contract) and its **price** (a catalog concern — inventory reports quantity).
 * In their place is the row's effective threshold, which is worth showing now
 * that it is genuinely per-row: the same product can be "low" at 5 in one
 * outlet and at 20 in another (§4.1 rule 5).
 */

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StockBadge, rowTint } from '@/components/pages/inventory/stock-status';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { InventoryItem } from '@/services/inventory';
import { formatDateTime, formatTimeAgo } from '@/lib/date';
import { formatCount } from '@/lib/number';
import { stockLevel } from '@/lib/stock';
import { cn } from '@/lib/utils';
import { initials } from '@/components/ui/avatar';

export type InventoryRow = {
  inventoryId: string;
  productId: string;
  name: string;
  outletId: string;
  outletName: string;
  quantity: number;
  /** Override where the outlet set one, product base otherwise (§4.1 rule 5). */
  effectiveLowStockThreshold: number;
  /** The server's own verdict, kept for callers that would rather not recompute. */
  isLowStock: boolean;
  updatedAt: string | null;
};

/** The list payload is already flat — this only renames it into domain terms. */
export function toInventoryRow(item: InventoryItem): InventoryRow {
  return {
    inventoryId: item.inventoryId,
    productId: item.productId,
    name: item.productName,
    outletId: item.outletId,
    outletName: item.outletName,
    quantity: item.quantity,
    effectiveLowStockThreshold: item.effectiveLowStockThreshold,
    isLowStock: item.isLowStock,
    updatedAt: item.updatedAt,
  };
}

type InventoryTableProps = {
  rows: InventoryRow[];
  /** Admin only. Absent means no action column is rendered. */
  onAdjust?: ((row: InventoryRow) => void) | undefined;
  onOpenStockPerOutlet: (row: InventoryRow) => void;
  emptyMessage: string;
  /**
   * Present when the empty table is the result of a filter rather than an empty
   * outlet — the two states get different copy *and* different ways out.
   */
  onClearFilters?: (() => void) | undefined;
};

export function InventoryTable({
  rows,
  onAdjust,
  onOpenStockPerOutlet,
  emptyMessage,
  onClearFilters,
}: InventoryTableProps) {
  const stacked = useBreakpoint() === 'mobile';

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-md py-3xl">
        <Text variant="body" tone="muted" className="text-center">
          {emptyMessage}
        </Text>
        {onClearFilters && (
          <Button variant="ghost" onClick={onClearFilters}>
            <Text>Hapus filter</Text>
          </Button>
        )}
      </div>
    );
  }

  if (stacked) {
    return (
      <div className="flex flex-col gap-md">
        {rows.map((row) => {
          const level = stockLevel(row.quantity, row.effectiveLowStockThreshold);

          return (
            <div
              key={row.inventoryId}
              className={cn(
                'flex flex-col gap-sm rounded-md border border-border p-md',
                rowTint(level)
              )}
            >
              <ProductCell row={row} onOpen={() => onOpenStockPerOutlet(row)} />

              <Line label="Outlet">
                <Text variant="body">{row.outletName}</Text>
              </Line>
              <Line label="Stok">
                <Text variant="body-strong" className="tabular-nums">
                  {formatCount(row.quantity)}
                </Text>
              </Line>
              <Line label="Batas">
                <Text variant="mono" tone="muted">
                  {formatCount(row.effectiveLowStockThreshold)}
                </Text>
              </Line>
              <Line label="Status Stok">
                <StockBadge level={level} />
              </Line>
              <Line label="Terakhir Diubah">
                <UpdatedAt value={row.updatedAt} />
              </Line>

              {onAdjust ? (
                <Button variant="secondary" size="sm" onClick={() => onAdjust(row)}>
                  <Text>Sesuaikan</Text>
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-row gap-md border-b border-border pb-sm">
        <Head className="flex-[3]">Produk</Head>
        <Head className="flex-[2]">Outlet</Head>
        <Head className="flex-1 justify-end">Stok</Head>
        <Head className="flex-1 justify-end">Batas</Head>
        <Head className="flex-1">Status Stok</Head>
        <Head className="flex-1">Terakhir Diubah</Head>
        {onAdjust ? <Head className="w-[120px] shrink-0">Aksi</Head> : null}
      </div>

      {rows.map((row) => {
        const level = stockLevel(row.quantity, row.effectiveLowStockThreshold);

        return (
          <div
            key={row.inventoryId}
            className={cn(
              'flex flex-row items-center gap-md border-b border-border py-md',
              rowTint(level)
            )}
          >
            <div className="min-w-0 flex-[3]">
              <ProductCell row={row} onOpen={() => onOpenStockPerOutlet(row)} />
            </div>

            <div className="min-w-0 flex-[2]">
              <Text variant="body" className="block truncate">
                {row.outletName}
              </Text>
            </div>

            {/* The number the screen exists for: large, mono, right-aligned. */}
            <div className="flex flex-1 justify-end">
              <Text variant="h3" className="tabular-nums">
                {formatCount(row.quantity)}
              </Text>
            </div>

            <div className="flex flex-1 justify-end">
              <Text variant="mono" tone="muted">
                {formatCount(row.effectiveLowStockThreshold)}
              </Text>
            </div>

            <div className="flex-1">
              <StockBadge level={level} />
            </div>

            <div className="min-w-0 flex-1">
              <UpdatedAt value={row.updatedAt} />
            </div>

            {onAdjust ? (
              <div className="w-[120px] shrink-0">
                <Button variant="secondary" size="sm" onClick={() => onAdjust(row)}>
                  <Text>Sesuaikan</Text>
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The product name doubles as the entry point to the per-outlet drawer, which
 * is available to both roles — looking is not managing.
 */
function ProductCell({ row, onOpen }: { row: InventoryRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Lihat stok ${row.name} per outlet`}
      className="flex min-w-0 flex-row items-center gap-md rounded-md text-left focus-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-subtle">
        <Text variant="label" tone="muted">
          {initials(row.name)}
        </Text>
      </span>
      <Text variant="body-strong" className="min-w-0 truncate underline-offset-2 hover:underline">
        {row.name}
      </Text>
    </button>
  );
}

function UpdatedAt({ value }: { value: string | null }) {
  if (!value) {
    return (
      <Text variant="caption" tone="subtle">
        —
      </Text>
    );
  }

  return (
    <Text variant="caption" tone="subtle" title={formatDateTime(value)} className="block truncate">
      {formatTimeAgo(value)}
    </Text>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-row items-center justify-between gap-md">
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      {children}
    </div>
  );
}

function Head({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex', className)}>
      <Text variant="caption" tone="subtle">
        {children}
      </Text>
    </div>
  );
}
