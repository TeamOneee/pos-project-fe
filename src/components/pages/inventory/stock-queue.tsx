/** The stock work queue (S-15c), severity first. */

import { CheckCircle2 } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { InactiveProductBadge } from '@/components/pages/catalog/catalog-badges';
import { Segmented } from '@/components/pages/owner/controls';
import { STOCK_LABEL } from '@/components/pages/inventory/stock-status';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { LowStockItem } from '@/services/dashboard';
import { formatCount } from '@/lib/number';
import { isOutOfStock } from '@/lib/stock';
import { cn } from '@/lib/utils';

export const HEALTHY_COPY = 'Semua stok dalam kondisi aman.';

export const STOCK_FILTERS = ['all', 'out', 'low'] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

type QueueProduct = { productId: string; name: string };

/** A payload row plus the one thing §6.4's row cannot tell us. */
export type QueueRow = LowStockItem & { inactive: boolean };

export type QueueCounts = { all: number; out: number; low: number };

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */

/** Tags rows against the ids of products known to be deactivated. */
export function toQueueRows(
  alerts: readonly LowStockItem[],
  inactiveIds: ReadonlySet<string>
): QueueRow[] {
  return alerts.map((alert) => ({ ...alert, inactive: inactiveIds.has(alert.productId) }));
}

export function countQueue(rows: readonly { quantity: number }[]): QueueCounts {
  const out = rows.filter(isOutOfStock).length;
  return { all: rows.length, out, low: rows.length - out };
}

export function filterQueue<T extends { quantity: number }>(rows: T[], filter: StockFilter): T[] {
  if (filter === 'all') return rows;
  if (filter === 'out') return rows.filter(isOutOfStock);
  return rows.filter((row) => !isOutOfStock(row));
}

/* -------------------------------------------------------------------------- */
/* Filter                                                                      */
/* -------------------------------------------------------------------------- */

/** The queue's counters and its filter, in one control. */
export function StockQueueFilter({
  counts,
  value,
  onChange,
}: {
  counts: QueueCounts;
  value: StockFilter;
  onChange: (next: StockFilter) => void;
}) {
  return (
    <Segmented
      options={STOCK_FILTERS}
      value={value}
      onChange={onChange}
      accessibilityLabel="Saring antrean stok"
      labels={{
        all: `Semua ${formatCount(counts.all)}`,
        out: `Habis ${formatCount(counts.out)}`,
        low: `Menipis ${formatCount(counts.low)}`,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Table                                                                       */
/* -------------------------------------------------------------------------- */

type RowActions = {
  /** Admin only. Absent means no action column is rendered at all. */
  onAdjust?: ((alert: LowStockItem) => void) | undefined;
  onOpenStockPerOutlet: (product: QueueProduct) => void;
};

export function StockQueueTable({
  rows,
  onAdjust,
  onOpenStockPerOutlet,
}: { rows: QueueRow[] } & RowActions) {
  const stacked = useBreakpoint() === 'mobile';

  if (stacked) {
    return (
      <div className="flex flex-col gap-md">
        {rows.map((row) => (
          <QueueCard
            key={rowKey(row)}
            row={row}
            onAdjust={onAdjust}
            onOpenStockPerOutlet={onOpenStockPerOutlet}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-row gap-md border-b border-border pb-sm pl-md">
        <Head className="flex-[3]">Produk</Head>
        <Head className="flex-[2]">Outlet</Head>
        <Head className="flex-1">Stok</Head>
        <Head className="flex-1 justify-end">Batas</Head>
        {onAdjust ? <Head className="w-[160px] shrink-0">Aksi</Head> : null}
      </div>

      {rows.map((row) => (
        <QueueRowView
          key={rowKey(row)}
          row={row}
          onAdjust={onAdjust}
          onOpenStockPerOutlet={onOpenStockPerOutlet}
        />
      ))}
    </div>
  );
}

function QueueRowView({ row, onAdjust, onOpenStockPerOutlet }: { row: QueueRow } & RowActions) {
  return (
    <div
      role="group"
      aria-label={rowLabel(row)}
      className="flex flex-row items-center gap-md border-b border-border py-md pl-md last:border-b-0"
    >
      <div className="flex min-w-0 flex-[3] flex-row items-center gap-sm">
        <ProductButton
          product={toProduct(row)}
          onOpen={() => onOpenStockPerOutlet(toProduct(row))}
        />
        {row.inactive && <InactiveProductBadge />}
      </div>
      <div className="min-w-0 flex-[2]">
        <Text variant="body" className="block truncate">
          {row.outletName}
        </Text>
      </div>
      <div className="flex-1">
        <StockCell row={row} />
      </div>
      <div className="flex flex-1 justify-end">
        <ThresholdText alert={row} />
      </div>
      {onAdjust ? (
        <div className="w-[160px] shrink-0">
          <AdjustButton row={row} onAdjust={onAdjust} />
        </div>
      ) : null}
    </div>
  );
}

function QueueCard({ row, onAdjust, onOpenStockPerOutlet }: { row: QueueRow } & RowActions) {
  return (
    <div
      role="group"
      aria-label={rowLabel(row)}
      className="flex flex-col gap-sm rounded-md border border-border p-md"
    >
      <div className="flex flex-row items-center gap-sm">
        <ProductButton
          product={toProduct(row)}
          onOpen={() => onOpenStockPerOutlet(toProduct(row))}
        />
        {row.inactive && <InactiveProductBadge />}
      </div>
      <Line label="Outlet">
        <Text variant="body">{row.outletName}</Text>
      </Line>
      <Line label="Stok">
        <StockCell row={row} />
      </Line>
      <Line label="Batas">
        <ThresholdText alert={row} />
      </Line>
      {onAdjust ? <AdjustButton row={row} onAdjust={onAdjust} /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

export function StockQueueCard({
  title,
  rows,
  counts,
  filter,
  onFilterChange,
  onAdjust,
  onOpenStockPerOutlet,
  filteredEmpty,
  notice,
}: {
  /** Omitted on S-15c, whose own screen heading already names it. */
  title?: string;
  rows: QueueRow[];
  counts: QueueCounts;
  filter: StockFilter;
  onFilterChange: (next: StockFilter) => void;
  filteredEmpty?: React.ReactNode;
  notice?: React.ReactNode;
} & RowActions) {
  const healthy = counts.all === 0;

  return (
    <div className="flex flex-col gap-md rounded-lg border border-border bg-surface p-lg">
      {(title || !healthy) && (
        <div className="flex flex-col gap-md tablet:flex-row tablet:items-center tablet:justify-between">
          {title ? <Text variant="h2">{title}</Text> : <span />}
          {/*
            A three-chip control over nothing is noise, so it goes when the queue
            is empty. Individual zeroes stay: "Habis 0" is information, and
            hiding a chip mid-work moves the other two under the pointer.
          */}
          {!healthy && (
            <StockQueueFilter counts={counts} value={filter} onChange={onFilterChange} />
          )}
        </div>
      )}

      {notice}

      {healthy ? (
        <HealthyState />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-md py-3xl">
          {filteredEmpty}
          <Button variant="ghost" onClick={() => onFilterChange('all')}>
            <Text>Lihat semua</Text>
          </Button>
        </div>
      ) : (
        <StockQueueTable
          rows={rows}
          onAdjust={onAdjust}
          onOpenStockPerOutlet={onOpenStockPerOutlet}
        />
      )}
    </div>
  );
}

/** Said when the product-status join could only answer for part of the catalogue. */
export function PartialStatusNotice({
  complete,
  pending,
}: {
  complete: boolean;
  pending: boolean;
}) {
  // Pending is not partial: the index is simply empty, which looks exactly like a merchant with
  // nothing deactivated.
  if (complete || pending) return null;

  return (
    <Text variant="caption" tone="warning" role="status">
      Sebagian status produk belum terbaca — beberapa baris mungkin produk nonaktif.
    </Text>
  );
}

function HealthyState() {
  return (
    <div className="flex flex-row items-center gap-md rounded-md bg-success-subtle p-md">
      <Icon as={CheckCircle2} size={20} className="text-success" />
      <Text variant="body">{HEALTHY_COPY}</Text>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared                                                                      */
/* -------------------------------------------------------------------------- */

function rowKey(row: QueueRow): string {
  return `${row.outletId}-${row.productId}`;
}

/** Names the row for a screen reader, and gives a test something stable to hold. */
function rowLabel(row: QueueRow): string {
  return `${row.productName} · ${row.outletName}`;
}

/** The quantity, or the word for having none of it. */
function StockCell({ row }: { row: QueueRow }) {
  if (isOutOfStock(row)) {
    return (
      <Badge variant="danger">
        <Text>{STOCK_LABEL.out}</Text>
      </Badge>
    );
  }

  return (
    <Badge variant="warning">
      <Text>{formatCount(row.quantity)}</Text>
    </Badge>
  );
}

/**
 * Withheld on a deactivated product: its stock is real, but adjusting it is not work anyone needs
 * done.
 */
function AdjustButton({
  row,
  onAdjust,
}: {
  row: QueueRow;
  onAdjust: (alert: LowStockItem) => void;
}) {
  if (row.inactive) return null;

  return (
    <Button variant="secondary" size="sm" onClick={() => onAdjust(row)}>
      <Text>Sesuaikan Stok</Text>
    </Button>
  );
}

function toProduct(row: QueueRow): QueueProduct {
  return { productId: row.productId, name: row.productName };
}

/**
 * The threshold this row was actually judged against, marked when it is an outlet override rather
 * than the product's own — otherwise an Admin comparing two outlets sees two different limits with
 * no explanation.
 */
function ThresholdText({ alert }: { alert: LowStockItem }) {
  const overridden = alert.lowStockThresholdOverride !== null;

  return (
    <Text
      variant="mono"
      tone="muted"
      {...(overridden
        ? { title: `Batas khusus outlet ini (dasar produk: ${alert.baseLowStockThreshold})` }
        : {})}
    >
      {formatCount(alert.effectiveLowStockThreshold)}
      {overridden ? '*' : ''}
    </Text>
  );
}

function ProductButton({ product, onOpen }: { product: QueueProduct; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Lihat stok ${product.name} per outlet`}
      className="min-w-0 max-w-full rounded-md text-left focus-ring"
    >
      <Text variant="body-strong" className="block truncate underline-offset-2 hover:underline">
        {product.name}
      </Text>
    </button>
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

function Head({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex', className)}>
      <Text variant="caption" tone="subtle">
        {children}
      </Text>
    </div>
  );
}
