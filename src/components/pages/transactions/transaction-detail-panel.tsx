/** The body behind `/transactions/:id`, in both its containers. */

import * as React from 'react';

import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
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

export function TransactionDetailPanel({ transactionId }: { transactionId: string }) {
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
      // Same receipt, sized for where it is going: an 80mm roll, or a sheet.
      const data = receiptFromDto(dto);
      await (destination === 'print'
        ? printReceipt(receiptHtml(data))
        : downloadReceiptPdf(receiptHtml(data, 'a4')));
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
