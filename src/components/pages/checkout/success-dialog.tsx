/**
 * S-19 · Payment succeeded.
 *
 * Celebratory but quick to leave: the primary action starts the next sale,
 * because the next customer is already waiting. Printing and sharing are
 * secondary and never block that.
 *
 * The breakdown is collapsed by default. It contains Subtotal and Total and
 * nothing between them — rule 2, and a receipt is exactly where a stray
 * discount row would do the most damage.
 */

import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { ReceiptData } from '@/lib/receipt-data';
import { formatDateTime } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

type SuccessDialogProps = {
  open: boolean;
  receipt: ReceiptData | null;
  onNewTransaction: () => void;
  onPrint: () => void;
  onShare: () => void;
  /** False on browsers with no Web Share API; the button says so instead. */
  canShare: boolean;
  busy?: boolean;
};

export function SuccessDialog({
  open,
  receipt,
  onNewTransaction,
  onPrint,
  onShare,
  canShare,
  busy = false,
}: SuccessDialogProps) {
  const [expanded, setExpanded] = React.useState(false);

  if (!receipt) return null;

  return (
    // Not dismissable by overlay: leaving is a decision, and the only way out
    // starts the next sale.
    <Dialog open={open}>
      <DialogContent hideClose className="max-w-[480px]">
        <div className="flex flex-col items-center gap-md">
          <SuccessCheck />

          <Text variant="h1">Pembayaran Berhasil</Text>

          <Text variant="mono" tone="muted">
            {receipt.transactionNumber}
          </Text>

          <Text variant="display" className="tabular-nums">
            {formatIDR(receipt.total)}
          </Text>

          {receipt.change !== null && (
            <div className="flex flex-row items-center gap-sm">
              <Text variant="body" tone="muted">
                Kembalian
              </Text>
              <Text variant="h2" tone="success" className="tabular-nums">
                {formatIDR(receipt.change)}
              </Text>
            </div>
          )}
        </div>

        <Button variant="ghost" onClick={() => setExpanded((value) => !value)}>
          <Text>Lihat Rincian</Text>
          <Icon as={expanded ? ChevronUp : ChevronDown} size={16} className="text-fg-muted" />
        </Button>

        {expanded && <ReceiptBreakdown receipt={receipt} />}

        <div className="flex flex-col gap-sm">
          <Button size="lg" onClick={onNewTransaction}>
            <Text>Transaksi Baru</Text>
          </Button>

          <div className="flex flex-row gap-sm">
            <Button variant="ghost" className="flex-1" disabled={busy} onClick={onPrint}>
              <Text>Cetak Struk</Text>
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              disabled={busy || !canShare}
              onClick={onShare}
            >
              <Text>Bagikan</Text>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The one place in this product for a flourish. */
function SuccessCheck() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle">
      <Icon as={Check} size={32} className="text-success" />
    </div>
  );
}

function ReceiptBreakdown({ receipt }: { receipt: ReceiptData }) {
  return (
    <div className="flex flex-col gap-sm rounded-md bg-subtle p-md">
      <div className="flex flex-col gap-xs">
        <Text variant="body-strong">{receipt.merchantName}</Text>
        <Text variant="caption" tone="muted">
          {receipt.outletName}
        </Text>
        <Text variant="caption" tone="muted">
          Kasir: {receipt.cashierName}
        </Text>
        <Text variant="caption" tone="muted">
          {formatDateTime(receipt.issuedAt)}
        </Text>
      </div>

      <Separator />

      {receipt.lines.map((line, index) => (
        <div key={`${line.name}-${index}`} className="flex flex-row justify-between gap-md">
          <Text variant="caption" className="min-w-0 flex-1">
            {formatCount(line.quantity)} × {line.name}
          </Text>
          <Text variant="mono" className="tabular-nums">
            {formatIDR(line.subtotal)}
          </Text>
        </div>
      ))}

      <Separator />

      <div className="flex flex-row justify-between">
        <Text variant="caption" tone="muted">
          Subtotal
        </Text>
        <Text variant="mono" className="tabular-nums">
          {formatIDR(receipt.subtotal)}
        </Text>
      </div>
      {/* Nothing sits between Subtotal and Total. */}
      <div className="flex flex-row justify-between">
        <Text variant="body-strong">Total</Text>
        <Text variant="body-strong" className="tabular-nums">
          {formatIDR(receipt.total)}
        </Text>
      </div>
    </div>
  );
}
