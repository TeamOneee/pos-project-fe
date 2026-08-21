/** S-22 · Detail transaksi. */

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

/** §5.1 (OD-001) records three methods. There is no card/debit member. */
const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tunai',
  QRIS: 'QRIS',
  TRANSFER: 'Transfer Bank',
};

export function TransactionDetailBody({
  transaction,
  outletName,
  onPrint,
  onDownload,
  busy = false,
  /** Shown under the actions, e.g. how to save the print output as a PDF. */
  actionHint,
}: {
  transaction: TransactionDetail;
  /**
   * §5.4 `CheckoutResult` carries `outlet_id` but no outlet name — only `GET /receipts/:id` does.
   */
  outletName?: string;
  onPrint: () => void;
  onDownload: () => void;
  busy?: boolean;
  actionHint?: string;
}) {
  const items = transaction.items;

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
        <MetaRow label="Tanggal" value={formatDateTime(transaction.createdAt)} />
        <MetaRow label="Outlet" value={outletName || '—'} />
        <MetaRow label="Kasir" value={transaction.operator.name} />
        <MetaRow label="Metode Pembayaran" value={METHOD_LABEL[transaction.payment.method]} />
      </div>

      <Separator />

      <div className="flex flex-col gap-md">
        <Text variant="h3">{`Item (${formatCount(items.length)})`}</Text>

        {items.map((item) => (
          <div key={item.productId} className="flex flex-row items-start gap-md">
            <div className="flex min-w-0 flex-1 flex-col gap-xs">
              {/* The snapshot name, not a live lookup (BR-006). */}
              <Text variant="body-strong" className="block truncate">
                {item.name}
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
          {/* Printing is the point of reopening a sale; the PDF is the fallback. */}
          <Button variant="primary" className="flex-1" disabled={busy} onClick={onPrint}>
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
