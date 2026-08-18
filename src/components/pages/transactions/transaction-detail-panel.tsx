/**
 * The body behind `/transactions/:id`, in both its containers.
 *
 * The receipt comes from `GET /receipts/:transaction_id` (§5.2) rather than
 * being assembled from the transaction plus whatever the screen happens to
 * know. That endpoint is the only one carrying `merchant_name`, `outlet_name`
 * and `outlet_address`, and it renders from the sale's own snapshot — so a
 * reprint of a year-old sale shows the prices and the product names as they
 * were, not as they are (§5.2 note).
 *
 * It is also the only way a cashier can name their own outlet: `GET /outlets`
 * is Owner and Admin only.
 */

import * as React from 'react';

import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/components/pages/auth/auth-provider';
import {
  TransactionDetailBody,
  TransactionDetailError,
  TransactionDetailSkeleton,
} from '@/components/pages/transactions/transaction-detail';
import { useReceipt, useTransaction } from '@/hooks/use-transactions';
import { isApiErrorOfKind } from '@/api/errors';
import { downloadReceiptPdf, PDF_DESTINATION_HINT } from '@/lib/download-receipt';
import { printReceipt } from '@/lib/print-receipt';
import { receiptFromDto } from '@/lib/receipt-data';
import { receiptHtml } from '@/lib/receipt-html';
import { isTransactionVisible } from '@/lib/transaction-scope';

export function TransactionDetailPanel({ transactionId }: { transactionId: string }) {
  const { role, outletId } = useAuth();
  const { toast } = useToast();
  const detail = useTransaction(transactionId);
  const receiptQuery = useReceipt(transactionId);
  const [busy, setBusy] = React.useState(false);

  const transaction = detail.data ?? null;

  const emit = async (destination: 'print' | 'pdf') => {
    const dto = receiptQuery.data;
    if (!dto) {
      toast({
        variant: 'error',
        title: 'Struk belum siap',
        description: 'Data struk belum selesai dimuat. Coba lagi sebentar.',
      });
      return;
    }

    setBusy(true);
    try {
      const html = receiptHtml(receiptFromDto(dto));
      await (destination === 'print' ? printReceipt(html) : downloadReceiptPdf(html));
    } catch {
      toast({
        variant: 'error',
        title: 'Struk gagal disiapkan',
        description: 'Coba lagi, atau cetak dari perangkat lain.',
      });
    } finally {
      setBusy(false);
    }
  };

  if (detail.isPending) return <TransactionDetailSkeleton />;

  if (detail.isError || !transaction) {
    return <TransactionDetailError forbidden={isApiErrorOfKind(detail.error, 'forbidden')} />;
  }

  // The server scopes this too; the client agreeing with it keeps a deep link
  // out of another outlet's sale from rendering before the 404 arrives.
  if (!isTransactionVisible(transaction, role, outletId)) {
    return <TransactionDetailError forbidden />;
  }

  return (
    <>
      <TransactionDetailBody
        transaction={transaction}
        outletName={receiptQuery.data?.outletName ?? ''}
        busy={busy || receiptQuery.isPending}
        onPrint={() => void emit('print')}
        onDownload={() => void emit('pdf')}
        actionHint={PDF_DESTINATION_HINT}
      />

      {receiptQuery.isError && (
        <Text variant="caption" tone="warning">
          Struk tidak dapat dimuat, jadi pencetakan sementara tidak tersedia.
        </Text>
      )}
    </>
  );
}
