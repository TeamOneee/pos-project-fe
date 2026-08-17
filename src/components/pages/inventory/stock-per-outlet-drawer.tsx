/**
 * S-15b · Stok per Outlet.
 *
 * A right-hand drawer opened from any product row. It answers the one question
 * an outlet-scoped inventory table cannot: where else is this product, and how
 * much of it is there. That is also the question that precedes most transfers.
 *
 * There is no cross-outlet inventory endpoint, so the rows are fanned out over
 * the per-pairing one — see `useProductStockByOutlet`.
 */

import { Boxes } from 'lucide-react';

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { AdjustTarget } from '@/components/pages/inventory/adjust-stock-dialog';
import type { OutletOption } from '@/components/pages/inventory/outlet-picker';
import { StockBadge } from '@/components/pages/inventory/stock-status';
import { useProductStockByOutlet } from '@/hooks/use-inventory';
import { formatCount } from '@/lib/number';
import { stockLevel } from '@/lib/stock';

export type DrawerProduct = { productId: string; name: string; sku: string };

export function StockPerOutletDrawer({
  product,
  open,
  onOpenChange,
  outlets,
  threshold,
  /** Admin only. The Owner gets no adjust affordance at all, not a disabled one. */
  onAdjust,
}: {
  product: DrawerProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlets: OutletOption[];
  threshold: number;
  onAdjust?: ((target: AdjustTarget) => void) | undefined;
}) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="items-stretch justify-end p-0"
        className="h-full max-w-[480px] gap-lg overflow-y-auto rounded-none border-y-0 border-r-0 p-xl"
        aria-describedby={undefined}
      >
        <DrawerBody
          key={product.productId}
          product={product}
          outlets={outlets}
          threshold={threshold}
          onAdjust={onAdjust}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DrawerBody({
  product,
  outlets,
  threshold,
  onAdjust,
  onClose,
}: {
  product: DrawerProduct;
  outlets: OutletOption[];
  threshold: number;
  onAdjust: ((target: AdjustTarget) => void) | undefined;
  onClose: () => void;
}) {
  const outletIds = outlets.map((outlet) => outlet.outletId);
  const queries = useProductStockByOutlet(product.productId, outletIds);

  const loading = queries.some((query) => query.isPending);
  const rows = outlets.map((outlet, index) => ({
    outlet,
    inventoryId: queries[index]?.data?.inventoryId ?? null,
    quantity: queries[index]?.data?.quantity ?? 0,
    loading: queries[index]?.isPending ?? false,
  }));

  const total = rows.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <>
      <div className="flex flex-col gap-xs pr-touch">
        <div className="flex flex-row items-center gap-sm">
          <Icon as={Boxes} size={18} className="text-fg-muted" />
          <DialogTitle>{product.name}</DialogTitle>
        </div>
        {product.sku ? (
          <Text variant="caption" tone="muted">
            {product.sku}
          </Text>
        ) : null}
      </div>

      <Separator />

      <div className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.outlet.outletId}
            className="flex flex-row items-center justify-between gap-md border-b border-border py-md"
          >
            <Text variant="body" className="min-w-0 flex-1 truncate">
              {row.outlet.name}
            </Text>

            {row.loading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <div className="flex flex-row items-center gap-md">
                <Text variant="body-strong" className="tabular-nums">
                  {formatCount(row.quantity)}
                </Text>
                <StockBadge level={stockLevel(row.quantity, threshold)} />

                {/* Admin only — absent from the DOM for anyone else. */}
                {onAdjust && row.inventoryId ? (
                  <button
                    type="button"
                    onClick={() =>
                      onAdjust({
                        inventoryId: row.inventoryId as string,
                        productId: product.productId,
                        productName: product.name,
                        sku: product.sku,
                        outletId: row.outlet.outletId,
                        outletName: row.outlet.name,
                        currentStock: row.quantity,
                      })
                    }
                    className="min-h-touch rounded-md px-sm outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Text variant="body-strong" tone="accent">
                      Sesuaikan
                    </Text>
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-row items-center justify-between gap-md py-md">
          <Text variant="body-strong">Total</Text>
          {loading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <Text variant="body-strong" className="tabular-nums">
              {`${formatCount(total)} unit`}
            </Text>
          )}
        </div>
      </div>

      <DialogClose asChild>
        <button
          type="button"
          onClick={onClose}
          className="min-h-touch self-start rounded-md px-sm outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Text variant="body-strong" tone="muted">
            Tutup
          </Text>
        </button>
      </DialogClose>
    </>
  );
}
