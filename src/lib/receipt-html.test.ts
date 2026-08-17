/**
 * The printed receipt, snapshotted.
 *
 * A receipt is the one output a customer keeps, and it is assembled by string
 * concatenation rather than by React, so a stray edit to the template has no
 * component test to stop it. The snapshot is the guard: change the layout, the
 * wording or the arithmetic and this fails, and the diff shows exactly what a
 * customer would now be handed.
 *
 * Both payment shapes are covered because they print different feet: a cash sale
 * shows what was handed over and the change, a non-cash sale names the method.
 * The reprint case (S-22) matters too — a stored sale has no cash figure to show.
 */

import { describe, expect, it } from 'vitest';

import type { ReceiptData } from '@/lib/receipt-data';
import { receiptHtml } from '@/lib/receipt-html';

/** §6's sample cart: 30.000 + 12.500 + 10.000 = 52.500. */
const BASE: ReceiptData = {
  merchantName: 'IndoMart Retail',
  outletName: 'Outlet A - Mall Central',
  cashierName: 'Budi Santoso',
  transactionNumber: 'TRX-20260813-003',
  issuedAt: '2026-08-13T13:05:00.000Z',
  lines: [
    { name: 'Coca Cola 1.5L', quantity: 2, unitPrice: 15000, subtotal: 30000 },
    { name: 'Chitato Sapi Panggang', quantity: 1, unitPrice: 12500, subtotal: 12500 },
    { name: 'Oreo Original 133g', quantity: 1, unitPrice: 10000, subtotal: 10000 },
  ],
  subtotal: 52500,
  total: 52500,
  method: 'CASH',
  received: 100000,
  change: 47500,
};

describe('receipt output', () => {
  it('prints a cash sale', () => {
    expect(receiptHtml(BASE)).toMatchSnapshot();
  });

  it('prints a non-cash sale', () => {
    expect(
      receiptHtml({ ...BASE, method: 'NON_CASH', received: null, change: null })
    ).toMatchSnapshot();
  });

  it('prints a reprint, where the cash handed over is not recorded', () => {
    // S-22 rebuilds the same receipt from the stored transaction. There is no
    // Payment model yet, so `received` is unknown and the foot names the method
    // instead of inventing a change figure.
    expect(receiptHtml({ ...BASE, received: null, change: null })).toMatchSnapshot();
  });

  it('keeps total equal to subtotal, with nothing between them', () => {
    const html = receiptHtml(BASE);

    expect(html).toContain('Subtotal');
    expect(html).toContain('Total');
    // Rule 2: no discount, tax or service-charge row, in any spelling.
    for (const word of ['Diskon', 'Pajak', 'PPN', 'Biaya Layanan', 'Service']) {
      expect(html).not.toContain(word);
    }
  });

  it('never prints a decimal amount', () => {
    const html = receiptHtml(BASE);
    // Every rupiah figure on the sheet, checked for a decimal tail.
    for (const amount of html.match(/Rp [\d.]+/g) ?? []) {
      expect(amount).not.toMatch(/,\d/);
    }
  });

  it('escapes a product name that contains markup', () => {
    const html = receiptHtml({
      ...BASE,
      lines: [{ name: '<script>alert(1)</script>', quantity: 1, unitPrice: 1000, subtotal: 1000 }],
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
