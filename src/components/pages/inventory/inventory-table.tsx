/** S-15's data table. */

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StockBadge, quantityTone } from '@/components/pages/inventory/stock-status';
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
   * Present when the empty table is the result of a filter rather than an empty outlet — the two
   * states get different copy *and* different ways out.
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
              className="flex flex-col gap-sm rounded-md border border-border p-md"
            >
              <ProductCell row={row} onOpen={() => onOpenStockPerOutlet(row)} />

              <Line label="Stok">
                <Text variant="body-strong" tone={quantityTone(level)} className="tabular-nums">
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
      <div className="flex flex-row items-center gap-md border-b border-border pb-sm">
        <Head className="min-w-0 flex-1">Produk</Head>
        <Head className="w-[80px] shrink-0 justify-end">Stok</Head>
        <Head className="w-[72px] shrink-0 justify-end">Batas</Head>
        <Head className="w-[120px] shrink-0">Status Stok</Head>
        <Head className="w-[150px] shrink-0">Terakhir Diubah</Head>
        {onAdjust ? <Head className="w-[120px] shrink-0">Aksi</Head> : null}
      </div>

      {rows.map((row) => {
        const level = stockLevel(row.quantity, row.effectiveLowStockThreshold);

        return (
          <div
            key={row.inventoryId}
            className="flex flex-row items-center gap-md border-b border-border py-md last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <ProductCell row={row} onOpen={() => onOpenStockPerOutlet(row)} />
            </div>

            {/* The number the screen exists for: large, right-aligned, and the
                one thing on the row that carries the alarm colour. */}
            <div className="flex w-[80px] shrink-0 justify-end">
              <Text variant="h3" tone={quantityTone(level)} className="tabular-nums">
                {formatCount(row.quantity)}
              </Text>
            </div>

            <div className="flex w-[72px] shrink-0 justify-end">
              <Text variant="mono" tone="muted">
                {formatCount(row.effectiveLowStockThreshold)}
              </Text>
            </div>

            <div className="w-[120px] shrink-0">
              <StockBadge level={level} />
            </div>

            <div className="w-[150px] min-w-0 shrink-0">
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
 * The product name doubles as the entry point to the per-outlet drawer, which is available to both
 * roles — looking is not managing.
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
