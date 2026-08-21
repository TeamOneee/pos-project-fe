/** S-15b · Stok per Outlet. */

import { Boxes } from 'lucide-react';

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { AdjustTarget } from '@/components/pages/inventory/adjust-stock-dialog';
import { StockBadge } from '@/components/pages/inventory/stock-status';
import { useProductStock } from '@/hooks/use-inventory';
import { formatCount } from '@/lib/number';
import { stockLevel } from '@/lib/stock';

export type DrawerProduct = { productId: string; name: string };

export function StockPerOutletDrawer({
  product,
  open,
  onOpenChange,
  /** Admin only. The Owner gets no adjust affordance at all, not a disabled one. */
  onAdjust,
}: {
  product: DrawerProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
          onAdjust={onAdjust}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DrawerBody({
  product,
  onAdjust,
  onClose,
}: {
  product: DrawerProduct;
  onAdjust: ((target: AdjustTarget) => void) | undefined;
  onClose: () => void;
}) {
  const stock = useProductStock(product.productId);

  const rows = stock.data?.items ?? [];
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <>
      <div className="flex flex-col gap-xs pr-touch">
        <div className="flex flex-row items-center gap-sm">
          <Icon as={Boxes} size={18} className="text-fg-muted" />
          <DialogTitle>{product.name}</DialogTitle>
        </div>
      </div>

      <Separator />

      {stock.isPending ? (
        <div className="flex flex-col gap-md">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : stock.isError ? (
        <Text variant="body" tone="danger">
          Gagal memuat stok per outlet.
        </Text>
      ) : rows.length === 0 ? (
        <Text variant="body" tone="muted">
          {`${product.name} belum memiliki stok di outlet mana pun.`}
        </Text>
      ) : (
        <div className="flex flex-col">
          {rows.map((row) => (
            <div
              key={row.inventoryId}
              className="flex flex-row items-center justify-between gap-md border-b border-border py-md"
            >
              <Text variant="body" className="min-w-0 flex-1 truncate">
                {row.outletName}
              </Text>

              <div className="flex flex-row items-center gap-md">
                <Text variant="body-strong" className="tabular-nums">
                  {formatCount(row.quantity)}
                </Text>
                <StockBadge level={stockLevel(row.quantity, row.effectiveLowStockThreshold)} />

                {/* Admin only — absent from the DOM for anyone else. */}
                {onAdjust ? (
                  <button
                    type="button"
                    onClick={() =>
                      onAdjust({
                        productId: product.productId,
                        productName: product.name,
                        outletId: row.outletId,
                        outletName: row.outletName,
                        currentStock: row.quantity,
                      })
                    }
                    className="min-h-touch rounded-md px-sm outline-none hover:bg-subtle focus-ring"
                  >
                    <Text variant="body-strong" tone="accent">
                      Sesuaikan
                    </Text>
                  </button>
                ) : null}
              </div>
            </div>
          ))}

          <div className="flex flex-row items-center justify-between gap-md py-md">
            <Text variant="body-strong">Total</Text>
            <Text variant="body-strong" className="tabular-nums">
              {`${formatCount(total)} unit`}
            </Text>
          </div>
        </div>
      )}

      <DialogClose asChild>
        <button
          type="button"
          onClick={onClose}
          className="min-h-touch self-start rounded-md px-sm outline-none hover:bg-subtle focus-ring"
        >
          <Text variant="body-strong" tone="muted">
            Tutup
          </Text>
        </button>
      </DialogClose>
    </>
  );
}
