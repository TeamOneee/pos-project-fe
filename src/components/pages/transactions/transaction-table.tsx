/**
 * S-21's table, and its stacked-card form below tablet.
 *
 * There is no row menu and no action beyond "Lihat", because there is nothing
 * else a completed sale supports: no edit, no void, no refund. A transaction in
 * this MVP is a fact that already happened.
 *
 * The transaction number is the row's identity and its link — mono so digits line
 * up, accent so it reads as tappable.
 */

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { Transaction } from '@/services/transactions';
import type { TransactionStatus } from '@/api/schema';
import { formatDate, formatTime } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';
import { cn } from '@/lib/utils';

/** `itemCount` is null when the backend does not count lines on a list row. */
export type TransactionRow = { transaction: Transaction; itemCount: number | null };

export function TransactionTable({
  rows,
  onOpen,
  /** True for the Cashier's own-outlet view, where every row is the same outlet. */
  hideOutlet = false,
}: {
  rows: TransactionRow[];
  onOpen: (transaction: Transaction) => void;
  hideOutlet?: boolean;
}) {
  const stacked = useBreakpoint() === 'mobile';

  if (stacked) {
    return (
      <div className="flex flex-col gap-md">
        {rows.map(({ transaction, itemCount }) => (
          <button
            key={transaction.transactionId}
            type="button"
            onClick={() => onOpen(transaction)}
            aria-label={`Lihat transaksi ${transaction.transactionNumber}`}
            className="flex flex-col gap-sm rounded-md border border-border p-md text-left focus-ring"
          >
            <div className="flex flex-row items-center justify-between gap-md">
              <Text variant="mono" tone="accent">
                {transaction.transactionNumber}
              </Text>
              <Text variant="body-strong" className="tabular-nums">
                {formatIDR(transaction.total)}
              </Text>
            </div>

            <div className="flex flex-row flex-wrap items-center gap-sm">
              <Text variant="caption" tone="muted">
                {stampOf(transaction)}
              </Text>
              {!hideOutlet && (
                <Text variant="caption" tone="muted">
                  · {transaction.outlet?.name ?? '—'}
                </Text>
              )}
              <Text variant="caption" tone="muted">
                · {transaction.cashier?.name ?? '—'}
              </Text>
              <Text variant="caption" tone="muted">
                · {itemCount === null ? '—' : `${formatCount(itemCount)} item`}
              </Text>
              <StatusBadge status={transaction.status} />
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-row gap-md border-b border-border pb-sm">
        <Head className="flex-[2]">No. Transaksi</Head>
        <Head className="flex-[2]">Tanggal &amp; Waktu</Head>
        {!hideOutlet && <Head className="flex-[2]">Outlet</Head>}
        <Head className="flex-1">Kasir</Head>
        <Head className="flex-1 justify-end">Item</Head>
        <Head className="flex-1 justify-end">Total</Head>
        <Head className="flex-1">Status</Head>
        <Head className="w-[90px] shrink-0">Aksi</Head>
      </div>

      {rows.map(({ transaction, itemCount }) => (
        <div
          key={transaction.transactionId}
          className="flex flex-row items-center gap-md border-b border-border py-md"
        >
          <div className="min-w-0 flex-[2]">
            <button
              type="button"
              onClick={() => onOpen(transaction)}
              aria-label={`Lihat transaksi ${transaction.transactionNumber}`}
              className="rounded-md text-left focus-ring"
            >
              <Text
                variant="mono"
                tone="accent"
                className="block truncate underline-offset-2 hover:underline"
              >
                {transaction.transactionNumber}
              </Text>
            </button>
          </div>

          <div className="min-w-0 flex-[2]">
            <Text variant="body" className="block truncate">
              {stampOf(transaction)}
            </Text>
          </div>

          {!hideOutlet && (
            <div className="min-w-0 flex-[2]">
              <Text variant="body" tone="muted" className="block truncate">
                {transaction.outlet?.name ?? '—'}
              </Text>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <Text variant="body" tone="muted" className="block truncate">
              {transaction.cashier?.name ?? '—'}
            </Text>
          </div>

          <div className="flex flex-1 justify-end">
            <Text variant="mono" tone="muted">
              {itemCount === null ? '—' : formatCount(itemCount)}
            </Text>
          </div>

          <div className="flex flex-1 justify-end">
            <Text variant="mono">{formatIDR(transaction.total)}</Text>
          </div>

          <div className="flex-1">
            <StatusBadge status={transaction.status} />
          </div>

          <div className="w-[90px] shrink-0">
            <Button variant="secondary" size="sm" onClick={() => onOpen(transaction)}>
              <Text>Lihat</Text>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

const STATUS_LABEL: Record<TransactionStatus, string> = {
  COMPLETED: 'SELESAI',
  PENDING: 'TERTUNDA',
  CANCELLED: 'DIBATALKAN',
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const variant = status === 'COMPLETED' ? 'success' : status === 'PENDING' ? 'warning' : 'neutral';

  return (
    <Badge variant={variant}>
      <Text>{STATUS_LABEL[status]}</Text>
    </Badge>
  );
}

function stampOf(transaction: Transaction): string {
  if (!transaction.createdAt) return '—';
  return `${formatDate(transaction.createdAt)} · ${formatTime(transaction.createdAt)}`;
}

function Head({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex', className)}>
      <Text variant="caption" tone="subtle">
        {children}
      </Text>
    </div>
  );
}
