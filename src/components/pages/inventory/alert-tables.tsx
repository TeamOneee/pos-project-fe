/**
 * The two alert tables, shared by the Admin dashboard (S-14 rows 3 and 4) and
 * the dedicated low-stock screen (S-15c).
 *
 * Both are cross-outlet, so the outlet is a column rather than a page-level
 * choice — they come from `GET /dashboard/low-stock` (§6.2), which spans every
 * outlet in the merchant unless one is selected.
 *
 * Low stock and out of stock are two views of one payload. §6.2 reports a
 * single `items[]` of everything at or below its effective threshold, and zero
 * is at or below every threshold — so the out-of-stock rows are the subset with
 * `quantity === 0` rather than a separate fetch.
 *
 * The threshold shown is the **effective** one: an outlet's override where it
 * has set one, the product's base value otherwise (§4.1 rule 5).
 */

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { LowStockItem } from '@/services/dashboard';
import { formatCount } from '@/lib/number';
import { byUrgency, isOutOfStock } from '@/lib/stock';
import { cn } from '@/lib/utils';

type AlertProduct = { productId: string; name: string };

type RowActions = {
  /** Admin only. Absent means no action column is rendered at all. */
  onAdjust?: ((alert: LowStockItem) => void) | undefined;
  onOpenStockPerOutlet: (product: AlertProduct) => void;
};

/** Most urgent first: lowest stock relative to its own effective threshold. */
export function sortByUrgency(alerts: readonly LowStockItem[]): LowStockItem[] {
  return [...alerts].sort(byUrgency);
}

/** The rows that are low but still sellable. */
export function lowStockOnly(alerts: readonly LowStockItem[]): LowStockItem[] {
  return alerts.filter((alert) => !isOutOfStock(alert));
}

/** The rows that have run out entirely. */
export function outOfStockOnly(alerts: readonly LowStockItem[]): LowStockItem[] {
  return alerts.filter(isOutOfStock);
}

/* -------------------------------------------------------------------------- */
/* Low stock                                                                   */
/* -------------------------------------------------------------------------- */

export function LowStockTable({
  alerts,
  onAdjust,
  onOpenStockPerOutlet,
}: { alerts: LowStockItem[] } & RowActions) {
  const stacked = useBreakpoint() === 'mobile';

  if (stacked) {
    return (
      <div className="flex flex-col gap-md">
        {alerts.map((alert) => (
          <div
            key={`${alert.outletId}-${alert.productId}`}
            className="flex flex-col gap-sm rounded-md border border-border p-md"
          >
            <ProductButton
              product={toProduct(alert)}
              onOpen={() => onOpenStockPerOutlet(toProduct(alert))}
            />
            <Line label="Outlet">
              <Text variant="body">{alert.outletName}</Text>
            </Line>
            <Line label="Stok Saat Ini">
              <Badge variant="warning">
                <Text>{formatCount(alert.quantity)}</Text>
              </Badge>
            </Line>
            <Line label="Batas">
              <ThresholdText alert={alert} />
            </Line>
            {onAdjust ? (
              <Button variant="secondary" size="sm" onClick={() => onAdjust(alert)}>
                <Text>Sesuaikan Stok</Text>
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-row gap-md border-b border-border pb-sm">
        <Head className="flex-[3]">Produk</Head>
        <Head className="flex-[2]">Outlet</Head>
        <Head className="flex-1">Stok Saat Ini</Head>
        <Head className="flex-1 justify-end">Batas</Head>
        {onAdjust ? <Head className="w-[160px] shrink-0">Aksi</Head> : null}
      </div>

      {alerts.map((alert) => (
        <div
          key={`${alert.outletId}-${alert.productId}`}
          className="flex flex-row items-center gap-md border-b border-border py-md"
        >
          <div className="min-w-0 flex-[3]">
            <ProductButton
              product={toProduct(alert)}
              onOpen={() => onOpenStockPerOutlet(toProduct(alert))}
            />
          </div>
          <div className="min-w-0 flex-[2]">
            <Text variant="body" className="block truncate">
              {alert.outletName}
            </Text>
          </div>
          <div className="flex-1">
            <Badge variant="warning">
              <Text>{formatCount(alert.quantity)}</Text>
            </Badge>
          </div>
          <div className="flex flex-1 justify-end">
            <ThresholdText alert={alert} />
          </div>
          {onAdjust ? (
            <div className="w-[160px] shrink-0">
              <Button variant="secondary" size="sm" onClick={() => onAdjust(alert)}>
                <Text>Sesuaikan Stok</Text>
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Out of stock                                                                */
/* -------------------------------------------------------------------------- */

export function OutOfStockTable({
  alerts,
  onAdjust,
  onOpenStockPerOutlet,
}: { alerts: LowStockItem[] } & RowActions) {
  const stacked = useBreakpoint() === 'mobile';

  if (stacked) {
    return (
      <div className="flex flex-col gap-md">
        {alerts.map((alert) => (
          <div
            key={`${alert.outletId}-${alert.productId}`}
            className="flex flex-col gap-sm rounded-md border border-border p-md"
          >
            <ProductButton
              product={toProduct(alert)}
              onOpen={() => onOpenStockPerOutlet(toProduct(alert))}
            />
            <Line label="Outlet">
              <Text variant="body">{alert.outletName}</Text>
            </Line>
            <Line label="Status">
              <Badge variant="danger">
                <Text>STOK HABIS</Text>
              </Badge>
            </Line>
            {onAdjust ? (
              <Button variant="secondary" size="sm" onClick={() => onAdjust(alert)}>
                <Text>Sesuaikan Stok</Text>
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-row gap-md border-b border-border pb-sm">
        <Head className="flex-[3]">Produk</Head>
        <Head className="flex-[2]">Outlet</Head>
        <Head className="flex-1">Status</Head>
        {onAdjust ? <Head className="w-[160px] shrink-0">Aksi</Head> : null}
      </div>

      {alerts.map((alert) => (
        <div
          key={`${alert.outletId}-${alert.productId}`}
          className="flex flex-row items-center gap-md border-b border-border py-md"
        >
          <div className="min-w-0 flex-[3]">
            <ProductButton
              product={toProduct(alert)}
              onOpen={() => onOpenStockPerOutlet(toProduct(alert))}
            />
          </div>
          <div className="min-w-0 flex-[2]">
            <Text variant="body" className="block truncate">
              {alert.outletName}
            </Text>
          </div>
          <div className="flex-1">
            <Badge variant="danger">
              <Text>STOK HABIS</Text>
            </Badge>
          </div>
          {onAdjust ? (
            <div className="w-[160px] shrink-0">
              <Button variant="secondary" size="sm" onClick={() => onAdjust(alert)}>
                <Text>Sesuaikan Stok</Text>
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared                                                                      */
/* -------------------------------------------------------------------------- */

function toProduct(alert: LowStockItem): AlertProduct {
  return { productId: alert.productId, name: alert.productName };
}

/**
 * The threshold this row was actually judged against, marked when it is an
 * outlet override rather than the product's own — otherwise an Admin comparing
 * two outlets sees two different limits with no explanation.
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

function ProductButton({ product, onOpen }: { product: AlertProduct; onOpen: () => void }) {
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
