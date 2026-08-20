/**
 * Tambah Stok.
 *
 * A freshly created product has no inventory row at any outlet: §4.2 never
 * seeds stock on create, and `GET /inventory` only returns rows that exist.
 * That leaves the first adjustment with nothing to hang off — the Stok screen
 * can only reach the adjust dialog from an existing row, so a new product is
 * unfindable there.
 *
 * This dialog is that missing entry point. It picks a product from the active
 * catalogue and hands it back so the caller can open `AdjustStockDialog` at
 * quantity 0; `POST /inventory/adjustments` addresses by `(outlet_id,
 * product_id)` and creates the row on first write, which is exactly how §4.2
 * says stock is initialized.
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { ProductSearchSelect, type PickedProduct } from './product-search-select';

export function AddStockDialog({
  open,
  onOpenChange,
  outletName,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletName: string;
  /** The caller opens the adjust dialog with this product at quantity 0. */
  onPick: (product: PickedProduct) => void;
}) {
  const [picked, setPicked] = useState<PickedProduct | null>(null);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) setPicked(null);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Tambah Stok</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-lg">
          <Text variant="caption" tone="muted">
            Pilih produk untuk menambah stok di {outletName}.
          </Text>
          <ProductSearchSelect value={picked} onChange={setPicked} autoFocus />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => close(false)}>
            <Text>Batal</Text>
          </Button>
          <Button disabled={!picked} onClick={() => picked && onPick(picked)}>
            <Text>Lanjut</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
