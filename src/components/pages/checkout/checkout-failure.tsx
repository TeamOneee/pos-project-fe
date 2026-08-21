/** The three ways a checkout fails (S-18a/b/c). */

import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { CheckoutFailure } from '@/lib/checkout-machine';
import { formatIDR, type Rupiah } from '@/lib/money';
import { formatCount } from '@/lib/number';
import type { CartLine } from '@/stores/cart';

type FailureBodyProps = {
  failure: CheckoutFailure;
  /** The basket as submitted, in order — faults are reported by position. */
  lines: readonly CartLine[];
  /** Total after accepting the server's prices; shown for the 409 only. */
  repricedTotal: Rupiah;
};

/** The line a fault points at, or null when the index does not resolve. */
function lineAt(lines: readonly CartLine[], index: number | null): CartLine | null {
  if (index === null) return null;
  return lines[index] ?? null;
}

function nameAt(lines: readonly CartLine[], index: number | null): string {
  return lineAt(lines, index)?.name ?? 'Produk tidak dikenal';
}

export function CheckoutFailureBody({ failure, lines, repricedTotal }: FailureBodyProps) {
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
            <div key={item.field} className="flex flex-col gap-xs">
              <Text variant="body-strong">{nameAt(lines, item.itemIndex)}</Text>
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
          {failure.items.map((item) => {
            const line = lineAt(lines, item.itemIndex);

            return (
              <div key={item.field} className="flex flex-col gap-xs">
                <Text variant="body-strong">{nameAt(lines, item.itemIndex)}</Text>
                <div className="flex flex-row items-center gap-sm">
                  {/* The old price is the cart's own — §5.2 reports only the new one. */}
                  {line ? (
                    <>
                      <Text variant="mono" tone="muted" className="line-through">
                        {formatIDR(line.unitPrice)}
                      </Text>
                      <Text variant="caption" tone="muted">
                        →
                      </Text>
                    </>
                  ) : null}
                  <Text variant="mono">{formatIDR(item.currentPrice)}</Text>
                </div>
              </div>
            );
          })}
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
