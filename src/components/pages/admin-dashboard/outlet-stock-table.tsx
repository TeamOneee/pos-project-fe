/**
 * S-14 row 2 — "Stok Per Outlet".
 *
 * The bridge from the dashboard to the work: every row ends in a link that
 * opens S-15 already scoped to that outlet.
 *
 * Each row is one `GET /dashboard/operations?outlet_id=` read (§6.2). That
 * endpoint reports how many product/outlet rows exist and how many are low or
 * out — but no total unit count, so the old "Total Stok" column is gone rather
 * than filled with a number the API does not produce.
 */

import { ArrowRight } from 'lucide-react';
import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { AlertCountChip } from '@/components/pages/inventory/stock-status';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';

/** One row, assembled by the page from an outlet and its operations read. */
export type OutletStats = {
  outletId: string;
  outletName: string;
  /** Product/outlet pairings that hold a stock row at this outlet. */
  stockedProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export function OutletStockTable({
  outlets,
  /** Opens S-15 pre-filtered to the outlet. */
  onManage,
  /** Says what this table's scope is when the page around it has another. */
  caption,
}: {
  outlets: OutletStats[];
  onManage: (outletId: string) => void;
  caption?: string;
}) {
  const stacked = useBreakpoint() === 'mobile';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stok Per Outlet</CardTitle>
        {caption ? (
          <Text variant="caption" tone="subtle">
            {caption}
          </Text>
        ) : null}
      </CardHeader>

      <CardContent>
        {outlets.length === 0 ? (
          <Text variant="body" tone="muted">
            Belum ada outlet.
          </Text>
        ) : stacked ? (
          <div className="flex flex-col gap-md">
            {outlets.map((outlet) => (
              <div
                key={outlet.outletId}
                className="flex flex-col gap-sm rounded-md border border-border p-md"
              >
                <Text variant="body-strong">{outlet.outletName}</Text>
                <Line label="Produk Berstok">
                  <Text variant="mono">{formatCount(outlet.stockedProducts)}</Text>
                </Line>
                <Line label="Stok Menipis">
                  <AlertCountChip
                    count={outlet.lowStockCount}
                    tone="warning"
                    label={`Stok menipis di ${outlet.outletName}`}
                  />
                </Line>
                <Line label="Stok Habis">
                  <AlertCountChip
                    count={outlet.outOfStockCount}
                    tone="danger"
                    label={`Stok habis di ${outlet.outletName}`}
                  />
                </Line>
                <ManageLink outlet={outlet} onManage={onManage} />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex flex-row items-center gap-md border-b border-border pb-sm">
              <Head className="min-w-0 flex-1">Outlet</Head>
              <Head className="w-[120px] shrink-0 justify-end">Produk Berstok</Head>
              <Head className="w-[104px] shrink-0">Stok Menipis</Head>
              <Head className="w-[96px] shrink-0">Stok Habis</Head>
              <Head className="w-[150px] shrink-0" />
            </div>

            {outlets.map((outlet) => (
              <div
                key={outlet.outletId}
                className="flex flex-row items-center gap-md border-b border-border py-md last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <Text variant="body-strong" className="block truncate">
                    {outlet.outletName}
                  </Text>
                </div>
                <div className="flex w-[120px] shrink-0 justify-end">
                  <Text variant="mono">{formatCount(outlet.stockedProducts)}</Text>
                </div>
                <div className="w-[104px] shrink-0">
                  <AlertCountChip
                    count={outlet.lowStockCount}
                    tone="warning"
                    label={`Stok menipis di ${outlet.outletName}`}
                  />
                </div>
                <div className="w-[96px] shrink-0">
                  <AlertCountChip
                    count={outlet.outOfStockCount}
                    tone="danger"
                    label={`Stok habis di ${outlet.outletName}`}
                  />
                </div>
                <div className="w-[150px] shrink-0">
                  <ManageLink outlet={outlet} onManage={onManage} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ManageLink({
  outlet,
  onManage,
}: {
  outlet: OutletStats;
  onManage: (outletId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onManage(outlet.outletId)}
      aria-label={`Kelola stok ${outlet.outletName}`}
      className="flex min-h-touch flex-row items-center gap-xs self-start rounded-md px-sm outline-none hover:bg-subtle focus-ring"
    >
      <Text variant="body-strong" tone="accent">
        Kelola Stok
      </Text>
      <Icon as={ArrowRight} size={16} className="text-accent" />
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

function Head({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex', className)}>
      <Text variant="caption" tone="subtle">
        {children}
      </Text>
    </div>
  );
}
