/** Tambah Stok. */

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
