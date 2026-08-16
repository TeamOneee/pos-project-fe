/**
 * The three ways a checkout fails (S-18a/b/c).
 *
 * All three render inside the payment modal with the form still on screen, so
 * the cashier can correct and resubmit rather than starting over.
 *
 * The distinction that matters most is the third one. A dropped connection is
 * not a failed sale — the request may have gone through — so it never says the
 * transaction failed. It says the status is unknown and points at the history,
 * because the dangerous move is charging the customer twice.
 */

import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { CheckoutFailure } from '@/lib/checkout-machine';
import { formatIDR, type Rupiah } from '@/lib/money';
import { formatCount } from '@/lib/number';

type FailureBodyProps = {
  failure: CheckoutFailure;
  /** Total after accepting the server's prices; shown for the 409 only. */
  repricedTotal: Rupiah;
};

export function CheckoutFailureBody({ failure, repricedTotal }: FailureBodyProps) {
  if (failure.kind === 'insufficient_stock') {
    return (
      <div className="flex flex-col gap-md">
        <Banner
          tone="danger"
          icon={CircleAlert}
          message="Stok tidak mencukupi untuk beberapa produk."
        />

        <div className="flex flex-col gap-sm">
          {failure.items.map((item) => (
            <div key={item.productId} className="flex flex-col gap-xs">
              <Text variant="body-strong">{item.productName}</Text>
              <Text variant="caption" tone="muted">
                Diminta {formatCount(item.requested)} ·{' '}
                <Text variant="caption" tone="danger">
                  Tersedia {formatCount(item.available)}
                </Text>
              </Text>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (failure.kind === 'price_changed') {
    return (
      <div className="flex flex-col gap-md">
        <Banner
          tone="warning"
          icon={TriangleAlert}
          message="Harga produk berubah sejak dimasukkan ke keranjang."
        />

        <div className="flex flex-col gap-sm">
          {failure.items.map((item) => (
            <div key={item.productId} className="flex flex-col gap-xs">
              <Text variant="body-strong">{item.productName}</Text>
              <div className="flex flex-row items-center gap-sm">
                <Text variant="mono" tone="muted" className="line-through">
                  {formatIDR(item.cartPrice)}
                </Text>
                <Text variant="caption" tone="muted">
                  →
                </Text>
                <Text variant="mono">{formatIDR(item.currentPrice)}</Text>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex flex-row items-center justify-between">
          <Text variant="body-strong">Total baru</Text>
          <Text variant="h2" className="tabular-nums">
            {formatIDR(repricedTotal)}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      <Banner
        tone="info"
        icon={Info}
        message="Koneksi terputus. Status transaksi belum diketahui."
      />

      <Text variant="body" tone="muted">
        <Text variant="body-strong">Jangan buat transaksi baru.</Text> Periksa riwayat transaksi
        terlebih dahulu untuk memastikan transaksi tidak tercatat dua kali.
      </Text>
    </div>
  );
}

function Banner({
  tone,
  icon,
  message,
}: {
  tone: 'danger' | 'warning' | 'info';
  icon: React.ComponentProps<typeof Icon>['as'];
  message: string;
}) {
  const background =
    tone === 'danger' ? 'bg-danger-subtle' : tone === 'warning' ? 'bg-warning-subtle' : 'bg-subtle';
  const colour =
    tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-info';

  return (
    <div role="alert" className={`flex flex-row items-start gap-md rounded-md p-md ${background}`}>
      <Icon as={icon} size={18} className={colour} />
      <Text variant="body" tone={tone} className="min-w-0 flex-1">
        {message}
      </Text>
    </div>
  );
}
