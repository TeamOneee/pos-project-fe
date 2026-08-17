/**
 * The two alert tables, shared by the Admin dashboard (S-14 rows 3 and 4) and
 * the dedicated low-stock screen (S-15c).
 *
 * Both are cross-outlet, so the outlet is a column rather than a page-level
 * choice — these are the one place stock is read across every outlet at once,
 * because they come from `/dashboard/admin` and `/inventory/low-stock`, not
 * from the outlet-scoped list endpoint.
 */

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { OutOfStockAlert } from '@/services/dashboard';
import type { LowStockAlert } from '@/services/inventory';
import { formatCount } from '@/lib/number';
import { byUrgency } from '@/lib/stock';
import { cn } from '@/lib/utils';

type AlertProduct = { productId: string; name: string; sku: string };

type RowActions = {
  /** Admin only. Absent means no action column is rendered at all. */
  onAdjust?: ((alert: LowStockAlert) => void) | undefined;
  onOpenStockPerOutlet: (product: AlertProduct) => void;
};

/* -------------------------------------------------------------------------- */
/* Low stock                                                                   */
/* -------------------------------------------------------------------------- */

/** Most urgent first: lowest stock relative to its own threshold. */
export function sortByUrgency(alerts: readonly LowStockAlert[]): LowStockAlert[] {
  return [...alerts].sort(byUrgency);
}

export function LowStockTable({
  alerts,
  onAdjust,
  onOpenStockPerOutlet,
}: { alerts: LowStockAlert[] } & RowActions) {
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
                <Text>{formatCount(alert.currentStock)}</Text>
              </Badge>
            </Line>
            <Line label="Batas">
              <Text variant="mono" tone="muted">
                {formatCount(alert.threshold)}
              </Text>
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
        <Head className="flex-1">SKU</Head>
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
          <div className="min-w-0 flex-1">
            <Text variant="mono" tone="muted" className="block truncate">
              {alert.sku || '—'}
            </Text>
          </div>
          <div className="min-w-0 flex-[2]">
            <Text variant="body" className="block truncate">
              {alert.outletName}
            </Text>
          </div>
          <div className="flex-1">
            <Badge variant="warning">
              <Text>{formatCount(alert.currentStock)}</Text>
            </Badge>
          </div>
          <div className="flex flex-1 justify-end">
            <Text variant="mono" tone="muted">
              {formatCount(alert.threshold)}
            </Text>
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
}: {
  alerts: OutOfStockAlert[];
  /** Takes the same shape as the low-stock action; stock is zero, threshold unknown. */
  onAdjust?: ((alert: OutOfStockAlert) => void) | undefined;
  onOpenStockPerOutlet: (product: AlertProduct) => void;
}) {
  const stacked = useBreakpoint() === 'mobile';

  if (stacked) {
    return (
      <div className="flex flex-col gap-md">
        {alerts.map((alert) => (
          <div
            key={`${alert.outletId}-${alert.productId}`}
            className="flex flex-col gap-sm rounded-md border border-border bg-danger-subtle p-md"
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
        <Head className="flex-1">SKU</Head>
        <Head className="flex-[2]">Outlet</Head>
        <Head className="flex-1">Status</Head>
        {onAdjust ? <Head className="w-[160px] shrink-0">Aksi</Head> : null}
      </div>

      {alerts.map((alert) => (
        <div
          key={`${alert.outletId}-${alert.productId}`}
          className="flex flex-row items-center gap-md border-b border-border bg-danger-subtle py-md"
        >
          <div className="min-w-0 flex-[3]">
            <ProductButton
              product={toProduct(alert)}
              onOpen={() => onOpenStockPerOutlet(toProduct(alert))}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Text variant="mono" tone="muted" className="block truncate">
              {alert.sku || '—'}
            </Text>
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

function toProduct(alert: { productId: string; productName: string; sku: string }): AlertProduct {
  return { productId: alert.productId, name: alert.productName, sku: alert.sku };
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
