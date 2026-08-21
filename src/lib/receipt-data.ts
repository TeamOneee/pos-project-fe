/** The receipt, as data. */

import type { PaymentMethod } from '@/lib/checkout-machine';
import type { Receipt, TransactionDetail, TransactionItem } from '@/services/transactions';
import { sumRupiah, type Rupiah } from '@/lib/money';

export type ReceiptLine = {
  name: string;
  quantity: number;
  unitPrice: Rupiah;
  subtotal: Rupiah;
};

export type ReceiptData = {
  merchantName: string;
  outletName: string;
  /** The operator who rang the sale — a cashier, or an owner working a till. */
  cashierName: string;
  transactionNumber: string;
  /** ISO timestamp; formatted at render time. */
  issuedAt: string;
  lines: ReceiptLine[];
  subtotal: Rupiah;
  /** Equal to subtotal, always. There is nothing between them. */
  total: Rupiah;
  method: PaymentMethod;
  received: Rupiah | null;
  change: Rupiah | null;
};

/**
 * §5.1 records three methods; the receipt, like the till, only distinguishes cash from everything
 * else.
 */
function tillMethod(method: TransactionDetail['payment']['method']): PaymentMethod {
  return method === 'CASH' ? 'CASH' : 'NON_CASH';
}

function toLines(items: TransactionItem[]): ReceiptLine[] {
  return items.map((item) => ({
    // The snapshot name, not a live product lookup — a renamed product must not change what an old
    // receipt says (BR-006).
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.subtotal,
  }));
}

/** The receipt for the sale that was just rung up. */
export function receiptFromCheckout(input: {
  transaction: TransactionDetail;
  merchantName: string;
  outletName: string;
  received: Rupiah | null;
}): ReceiptData {
  const { transaction } = input;
  const lines = toLines(transaction.items);
  const subtotal = transaction.subtotal || sumRupiah(lines.map((line) => line.subtotal));
  // Rule 2: total is subtotal. Not recomputed from anything else.
  const total = transaction.total || subtotal;
  const method = tillMethod(transaction.payment.method);

  return {
    merchantName: input.merchantName,
    outletName: input.outletName,
    cashierName: transaction.operator.name,
    transactionNumber: transaction.transactionNumber,
    issuedAt: transaction.createdAt,
    lines,
    subtotal,
    total,
    method,
    received: method === 'CASH' ? input.received : null,
    change: method === 'CASH' && input.received !== null ? input.received - total : null,
  };
}

/** The same receipt, rebuilt from a stored sale (S-22). */
export function receiptFromDto(receipt: Receipt): ReceiptData {
  const lines = toLines(receipt.items);
  const subtotal = receipt.subtotal || sumRupiah(lines.map((line) => line.subtotal));

  return {
    merchantName: receipt.merchantName,
    outletName: receipt.outletName,
    cashierName: receipt.operator.name,
    transactionNumber: receipt.transactionNumber,
    issuedAt: receipt.createdAt,
    lines,
    subtotal,
    total: receipt.total || subtotal,
    method: tillMethod(receipt.payment.method),
    received: null,
    change: null,
  };
}
