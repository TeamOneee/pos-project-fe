/**
 * The loaded detail: one query, one receipt, two destinations.
 *
 * Sits between the container (drawer or page) and the body, so the data and the
 * receipt actions are written once. The receipt is built with
 * `receiptFromTransaction`, the same `ReceiptData` shape the checkout path
 * produces, and rendered by the same `receiptHtml` — a reprint of a sale is the
 * document that sale printed, not a second design of it.
 *
 * A Cashier reaching another outlet's transaction is answered by the backend with
 * a 403, and this panel says so plainly. The check is repeated on the client
 * against the payload it did receive, so a more permissive backend cannot turn
 * into a leak here.
 */

import * as React from 'react';

import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/components/pages/auth/auth-provider';
import {
  TransactionDetailBody,
  TransactionDetailError,
  TransactionDetailSkeleton,
} from '@/components/pages/transactions/transaction-detail';
import { useMerchant } from '@/hooks/use-merchant';
import { useTransaction } from '@/hooks/use-transactions';
import { isApiErrorOfKind } from '@/api/errors';
import { can } from '@/lib/permissions';
import { downloadReceiptPdf, PDF_DESTINATION_HINT } from '@/lib/download-receipt';
import { printReceipt } from '@/lib/print-receipt';
import { receiptFromTransaction } from '@/lib/receipt-data';
import { receiptHtml } from '@/lib/receipt-html';
import { isTransactionVisible } from '@/lib/transaction-scope';

export function TransactionDetailPanel({ transactionId }: { transactionId: string }) {
  const { role, outletId } = useAuth();
  const { toast } = useToast();
  const detail = useTransaction(transactionId);
  const [busy, setBusy] = React.useState(false);

  // Only the Owner may read the merchant record; the outlet name on the
  // transaction carries the header otherwise.
  const merchant = useMerchant({ enabled: role !== null && can(role, 'merchant') });

  const transaction = detail.data?.transaction;

  const receipt = React.useMemo(() => {
    if (!detail.data || !transaction) return null;
    return receiptFromTransaction({
      transaction,
      items: detail.data.items,
      merchantName: merchant.data?.name ?? transaction.outlet?.name ?? '',
      outletName: transaction.outlet?.name ?? '',
      cashierName: transaction.cashier?.name ?? '',
    });
  }, [detail.data, transaction, merchant.data]);

  const emit = async (destination: 'print' | 'pdf') => {
    if (!receipt) return;
    setBusy(true);
    try {
      const html = receiptHtml(receipt);
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

  if (detail.isError || !detail.data || !transaction) {
    return <TransactionDetailError forbidden={isApiErrorOfKind(detail.error, 'forbidden')} />;
  }

  // Belt and braces: the server already refused, but if it ever answers with a
  // transaction outside the session's scope, this screen still will not show it.
  if (!isTransactionVisible(transaction, role, outletId)) {
    return <TransactionDetailError forbidden />;
  }

  return (
    <TransactionDetailBody
      detail={detail.data}
      busy={busy}
      onPrint={() => void emit('print')}
      onDownload={() => void emit('pdf')}
      actionHint={PDF_DESTINATION_HINT}
    />
  );
}
