/**
 * S-22 · Detail transaksi.
 *
 * One body, two containers: a 480px right drawer on desktop and tablet, a full
 * page on mobile. Same component either way, so the two cannot describe the same
 * sale differently.
 *
 * Three things this screen deliberately does not have: an edit button, a void
 * button and a refund button. A completed transaction is immutable in this MVP —
 * the API answers 501 on cancel — and the screen does not imply otherwise.
 *
 * The line prices are historical. The caption says so, because a product's price
 * can have moved since, and the natural assumption is that a screen showing a
 * price is showing today's.
 */

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/pages/transactions/transaction-table';
import type { PaymentMethod } from '@/api/schema';
import type { TransactionDetail } from '@/services/transactions';
import { formatDateTime } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

export const HISTORICAL_PRICE_NOTE = 'Harga yang ditampilkan adalah harga saat transaksi terjadi.';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tunai',
  QRIS: 'QRIS',
  DEBIT: 'Kartu Debit',
  TRANSFER: 'Transfer Bank',
};

export function TransactionDetailBody({
  detail,
  onPrint,
  onDownload,
  busy = false,
  /** Shown under the actions, e.g. how to save the print output as a PDF. */
  actionHint,
}: {
  detail: TransactionDetail;
  onPrint: () => void;
  onDownload: () => void;
  busy?: boolean;
  actionHint?: string;
}) {
  const { transaction, items } = detail;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <Text variant="h2" className="type-mono">
          {transaction.transactionNumber}
        </Text>
        <StatusBadge status={transaction.status} />
      </div>

      <Separator />

      <div className="flex flex-col gap-sm">
        <MetaRow
          label="Tanggal"
          value={transaction.createdAt ? formatDateTime(transaction.createdAt) : '—'}
        />
        <MetaRow label="Outlet" value={transaction.outlet?.name ?? '—'} />
        <MetaRow label="Kasir" value={transaction.cashier?.name ?? '—'} />
        <MetaRow
          label="Metode Pembayaran"
          value={transaction.payment ? METHOD_LABEL[transaction.payment.method] : '—'}
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-md">
        <Text variant="h3">{`Item (${formatCount(items.length)})`}</Text>

        {items.map((item) => (
          <div key={item.transactionItemId} className="flex flex-row items-start gap-md">
            <div className="flex min-w-0 flex-1 flex-col gap-xs">
              <Text variant="body-strong" className="block truncate">
                {item.product?.name ?? 'Produk tidak dikenal'}
              </Text>
              {/* The frozen unit price, spelled out against the quantity. */}
              <Text variant="caption" tone="muted" className="type-mono">
                {`${formatIDR(item.unitPrice)} × ${formatCount(item.quantity)}`}
              </Text>
            </div>
            <Text variant="mono" className="tabular-nums">
              {formatIDR(item.subtotal)}
            </Text>
          </div>
        ))}

        <Text variant="caption" tone="subtle">
          {HISTORICAL_PRICE_NOTE}
        </Text>
      </div>

      <Separator />

      {/* Subtotal then Total. Nothing sits between them — rule 2. */}
      <div className="flex flex-col gap-sm">
        <div className="flex flex-row items-center justify-between gap-md">
          <Text variant="body" tone="muted">
            Subtotal
          </Text>
          <Text variant="mono" className="tabular-nums">
            {formatIDR(transaction.subtotal)}
          </Text>
        </div>
        <div className="flex flex-row items-center justify-between gap-md">
          <Text variant="h3">Total</Text>
          <Text variant="h3" className="tabular-nums">
            {formatIDR(transaction.total)}
          </Text>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-sm">
        <div className="flex flex-col gap-md tablet:flex-row">
          <Button variant="secondary" className="flex-1" disabled={busy} onClick={onPrint}>
            <Text>Cetak Struk</Text>
          </Button>
          <Button variant="secondary" className="flex-1" disabled={busy} onClick={onDownload}>
            <Text>Unduh PDF</Text>
          </Button>
        </div>
        {actionHint ? (
          <Text variant="caption" tone="subtle">
            {actionHint}
          </Text>
        ) : null}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row items-start justify-between gap-md">
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Text variant="body" className="text-right">
        {value}
      </Text>
    </div>
  );
}

export function TransactionDetailSkeleton() {
  return (
    <div className="flex flex-col gap-lg">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-24" />
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="h-5 w-full" />
      ))}
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

/** Wraps the two failure cases a deep link can land on. */
export function TransactionDetailError({ forbidden }: { forbidden: boolean }) {
  return (
    <div className="flex flex-col items-center gap-md py-3xl">
      <Text variant="h3">
        {forbidden ? 'Transaksi tidak dapat dibuka' : 'Transaksi tidak ditemukan'}
      </Text>
      <Text variant="body" tone="muted" className="text-center">
        {forbidden
          ? 'Transaksi ini milik outlet lain, jadi tidak bisa ditampilkan di sini.'
          : 'Nomor transaksi ini tidak ada, atau sudah tidak tersedia.'}
      </Text>
    </div>
  );
}

/** The mobile page and the drawer share one heading. */
export const DETAIL_TITLE = 'Detail Transaksi';
