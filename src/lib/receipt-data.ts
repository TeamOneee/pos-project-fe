/**
 * The receipt, as data.
 *
 * Built once and rendered three ways: the collapsible breakdown in the success
 * modal, the printable 80mm sheet, and the file that gets shared. Keeping it a
 * plain object means those three cannot drift apart.
 */

import type { PaymentMethod } from '@/lib/checkout-machine';
import type { Transaction, TransactionItem } from '@/services/transactions';
import { sumRupiah, type Rupiah } from '@/lib/money';
import type { CartLine } from '@/stores/cart';

export type ReceiptLine = {
  name: string;
  quantity: number;
  unitPrice: Rupiah;
  subtotal: Rupiah;
};

export type ReceiptData = {
  merchantName: string;
  outletName: string;
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

type BuildInput = {
  transaction: Transaction;
  /** Server lines when the response carried them; the cart is the fallback. */
  items: TransactionItem[];
  cartLines: CartLine[];
  merchantName: string;
  outletName: string;
  cashierName: string;
  method: PaymentMethod;
  received: Rupiah | null;
};

export function buildReceipt(input: BuildInput): ReceiptData {
  const lines = receiptLines(input.items, input.cartLines);
  const subtotal = input.transaction.subtotal || sumRupiah(lines.map((line) => line.subtotal));

  return {
    merchantName: input.merchantName,
    outletName: input.outletName,
    cashierName: input.cashierName,
    transactionNumber: input.transaction.transactionNumber,
    issuedAt: input.transaction.createdAt ?? new Date().toISOString(),
    lines,
    subtotal,
    // Rule 2: total is subtotal. Not recomputed from anything else.
    total: input.transaction.total || subtotal,
    method: input.method,
    received: input.method === 'CASH' ? input.received : null,
    change:
      input.method === 'CASH' && input.received !== null
        ? input.received - (input.transaction.total || subtotal)
        : null,
  };
}

/**
 * An idempotent replay returns the transaction without its items, so the cart
 * that produced it stands in. Both describe the same sale.
 */
function receiptLines(items: TransactionItem[], cartLines: CartLine[]): ReceiptLine[] {
  if (items.length > 0) {
    return items.map((item) => ({
      name: item.product?.name ?? '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    }));
  }

  return cartLines.map((line) => ({
    name: line.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    subtotal: line.unitPrice * line.quantity,
  }));
}
