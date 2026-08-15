/**
 * S-17 · Payment, and the S-18 failures rendered inside it.
 *
 * While a request is in flight the modal cannot be dismissed and the confirm
 * button is disabled — but neither of those is the duplicate guard. The guard
 * is the lock in use-checkout.ts; this is the part of it the cashier can see.
 */

import { useRouter } from 'expo-router';
import { View , ActivityIndicator } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { CashPanel } from '@/features/checkout/cash-panel';
import { CheckoutFailureBody } from '@/features/checkout/checkout-failure';
import { isDismissable, repricedTotal as computeReprice } from '@/features/checkout/checkout-machine';
import { MethodCards } from '@/features/checkout/method-cards';
import type { useCheckout } from '@/features/checkout/use-checkout';
import { formatIDR, type Rupiah } from '@/lib/money';

type PaymentDialogProps = {
  open: boolean;
  onClose: () => void;
  checkout: ReturnType<typeof useCheckout>;
  total: Rupiah;
  /** Quantities by product, for recomputing the total at the server's prices. */
  quantities: Record<string, number>;
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
  quantities,
  onAdjustCart,
  onAcceptNewPrices,
}: PaymentDialogProps) {
  const router = useRouter();
  const { state } = checkout;

  const processing = state.status === 'processing';
  const dismissable = isDismissable(state);

  const reprice =
    state.failure?.kind === 'price_changed'
      ? computeReprice(state.failure.items, quantities, total)
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
          <View className="items-center gap-md py-2xl">
            <ActivityIndicator size="large" />
            <Text variant="h3">Memproses transaksi…</Text>
            <Text variant="caption" tone="muted" className="text-center">
              Jangan tutup atau muat ulang halaman.
            </Text>
          </View>
        ) : (
          <View className="gap-lg">
            {state.failure && (
              <CheckoutFailureBody failure={state.failure} repricedTotal={reprice} />
            )}

            <View className="items-center gap-xs rounded-md bg-subtle p-lg">
              <Text variant="caption" tone="muted">
                Total Tagihan
              </Text>
              <Text variant="mono" className="type-display">
                {formatIDR(total)}
              </Text>
            </View>

            <View className="gap-md">
              <Text variant="label" tone="muted">
                Metode Pembayaran
              </Text>
              <MethodCards
                value={state.method}
                onChange={checkout.selectMethod}
                disabled={processing}
              />
            </View>

            {state.method === 'CASH' ? (
              <CashPanel
                total={total}
                received={state.received}
                onChange={checkout.setReceived}
                disabled={processing}
              />
            ) : (
              <View className="rounded-md bg-subtle p-md">
                <Text variant="body" tone="muted">
                  Pembayaran dicatat secara manual. Pastikan pembayaran sudah diterima sebelum
                  melanjutkan.
                </Text>
              </View>
            )}
          </View>
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
      const productIds = state.failure.items.map((item) => item.productId);
      return (
        <>
          <Button variant="ghost" onPress={onClose}>
            <Text>Tutup</Text>
          </Button>
          <Button onPress={() => onAdjustCart(productIds)}>
            <Text>Sesuaikan Keranjang</Text>
          </Button>
        </>
      );
    }

    if (state.failure?.kind === 'price_changed') {
      return (
        <>
          <Button variant="ghost" onPress={onClose}>
            <Text>Batal</Text>
          </Button>
          <Button onPress={onAcceptNewPrices}>
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
          <Button variant="ghost" onPress={checkout.retry}>
            <Text>Coba Lagi</Text>
          </Button>
          <Button
            onPress={() => {
              onClose();
              router.push('/transactions');
            }}
          >
            <Text>Periksa Riwayat Transaksi</Text>
          </Button>
        </>
      );
    }

    return (
      <>
        <Button variant="ghost" onPress={onClose}>
          <Text>Batal</Text>
        </Button>
        <Button size="lg" disabled={!checkout.canConfirm} onPress={checkout.submit}>
          <Text>Konfirmasi Pembayaran</Text>
        </Button>
      </>
    );
  }
}
