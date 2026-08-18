/**
 * S-17 · Payment, and the S-18 failures rendered inside it.
 *
 * While a request is in flight the modal cannot be dismissed and the confirm
 * button is disabled — but neither of those is the duplicate guard. The guard
 * is the lock in use-checkout.ts; this is the part of it the cashier can see.
 */

import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { CashPanel } from '@/components/pages/checkout/cash-panel';
import { CheckoutFailureBody } from '@/components/pages/checkout/checkout-failure';
import { isDismissable, repricedTotal as computeReprice } from '@/lib/checkout-machine';
import { MethodCards } from '@/components/pages/checkout/method-cards';
import type { useCheckout } from '@/hooks/use-checkout';
import { formatIDR, type Rupiah } from '@/lib/money';
import type { CartLine } from '@/stores/cart';

type PaymentDialogProps = {
  open: boolean;
  onClose: () => void;
  checkout: ReturnType<typeof useCheckout>;
  total: Rupiah;
  /**
   * The basket as submitted, in order. §5.2 reports a faulted line by its
   * position in the request, so both the failure body and the reprice
   * calculation need the same array that was sent.
   */
  lines: readonly CartLine[];
  /** Flags the offending lines in the cart and closes the modal. */
  onAdjustCart: (productIds: string[]) => void;
  /** Rewrites the cart at the server's prices, then resubmits. */
  onAcceptNewPrices: () => void;
};

export function PaymentDialog({
  open,
  onClose,
  checkout,
  total,
  lines,
  onAdjustCart,
  onAcceptNewPrices,
}: PaymentDialogProps) {
  const navigate = useNavigate();
  const { state } = checkout;

  const processing = state.status === 'processing';
  const dismissable = isDismissable(state);

  const reprice =
    state.failure?.kind === 'price_changed'
      ? computeReprice(state.failure.items, lines, total)
      : total;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Refuses to close mid-request: the sale's outcome is not known yet.
        if (!next && dismissable) onClose();
      }}
    >
      <DialogContent hideClose={!dismissable} className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
        </DialogHeader>

        {processing ? (
          <div className="flex flex-col items-center gap-md py-2xl">
            <span
              role="status"
              aria-label="Memproses transaksi"
              className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-accent"
            />
            <Text variant="h3">Memproses transaksi…</Text>
            <Text variant="caption" tone="muted" className="text-center">
              Jangan tutup atau muat ulang halaman.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-lg">
            {state.failure && (
              <CheckoutFailureBody
                failure={state.failure}
                lines={lines}
                repricedTotal={reprice}
              />
            )}

            <div className="flex flex-col items-center gap-xs rounded-md bg-subtle p-lg">
              <Text variant="caption" tone="muted">
                Total Tagihan
              </Text>
              <Text variant="display" className="tabular-nums">
                {formatIDR(total)}
              </Text>
            </div>

            <div className="flex flex-col gap-md">
              <Text variant="label" tone="muted">
                Metode Pembayaran
              </Text>
              <MethodCards
                value={state.method}
                onChange={checkout.selectMethod}
                disabled={processing}
              />
            </div>

            {state.method === 'CASH' ? (
              <CashPanel
                total={total}
                received={state.received}
                onChange={checkout.setReceived}
                disabled={processing}
              />
            ) : (
              <div className="rounded-md bg-subtle p-md">
                <Text variant="body" tone="muted">
                  Pembayaran dicatat secara manual. Pastikan pembayaran sudah diterima sebelum
                  melanjutkan.
                </Text>
              </div>
            )}
          </div>
        )}

        <DialogFooter>{footerFor()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );

  function footerFor() {
    if (processing) {
      return (
        <Button size="lg" disabled loading>
          <Text>Memproses…</Text>
        </Button>
      );
    }

    if (state.failure?.kind === 'insufficient_stock') {
      // Positions back to product ids, so the cart can flag the right rows.
      const productIds = state.failure.items
        .map((item) => (item.itemIndex === null ? null : (lines[item.itemIndex]?.productId ?? null)))
        .filter((id): id is string => id !== null);
      return (
        <>
          <Button variant="ghost" onClick={onClose}>
            <Text>Tutup</Text>
          </Button>
          <Button onClick={() => onAdjustCart(productIds)}>
            <Text>Sesuaikan Keranjang</Text>
          </Button>
        </>
      );
    }

    if (state.failure?.kind === 'price_changed') {
      return (
        <>
          <Button variant="ghost" onClick={onClose}>
            <Text>Batal</Text>
          </Button>
          <Button onClick={onAcceptNewPrices}>
            <Text>Gunakan Harga Baru</Text>
          </Button>
        </>
      );
    }

    if (state.failure?.kind === 'unknown') {
      return (
        <>
          {/* Resends the identical request — the same idempotency key, so the
              server returns the sale it already made rather than making one. */}
          <Button variant="ghost" onClick={checkout.retry}>
            <Text>Coba Lagi</Text>
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate('/transactions');
            }}
          >
            <Text>Periksa Riwayat Transaksi</Text>
          </Button>
        </>
      );
    }

    return (
      <>
        <Button variant="ghost" onClick={onClose}>
          <Text>Batal</Text>
        </Button>
        <Button size="lg" disabled={!checkout.canConfirm} onClick={checkout.submit}>
          <Text>Konfirmasi Pembayaran</Text>
        </Button>
      </>
    );
  }
}
