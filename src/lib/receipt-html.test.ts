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

  it('sizes the a4 sheet, and asks the dialog for A4 paper', () => {
    const html = receiptHtml(BASE, 'a4');

    expect(html).toContain('size: A4');
    expect(html).toContain('width: 100%');
  });

  it('leaves the thermal column exactly as it was', () => {
    // The default is the roll; A4 is opt-in, so no print path shifts under it.
    expect(receiptHtml(BASE)).toBe(receiptHtml(BASE, 'thermal'));
    expect(receiptHtml(BASE)).not.toContain('size: A4');
  });

  it('escapes a product name that contains markup', () => {
    const html = receiptHtml({
      ...BASE,
      lines: [{ name: '<script>alert(1)</script>', quantity: 1, unitPrice: 1000, subtotal: 1000 }],
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  // The template escapes by construction now (lib/html.ts), so these guard the
  // wiring rather than nine separate calls.
  it('escapes every header field, not only the product name', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const html = receiptHtml({
      ...BASE,
      merchantName: payload,
      outletName: payload,
      cashierName: payload,
    });

    // 'onerror=' survives as text; there is no longer a tag for it to be in.
    expect(html).not.toContain('<img');
    expect(html.match(/&lt;img src=x onerror=alert\(1\)&gt;/g)).toHaveLength(3);
  });

  it('escapes a transaction number that tries to close the title element', () => {
    // An unescaped '</title>' ends the element early; the rest becomes markup.
    const html = receiptHtml({
      ...BASE,
      transactionNumber: '</title><script>alert(1)</script>',
    });

    expect(html).not.toContain('</title><script>');
    expect(html).toContain('&lt;/title&gt;');
  });

  it('escapes on the a4 sheet too, since it is the same markup', () => {
    const html = receiptHtml({ ...BASE, merchantName: '<script>alert(1)</script>' }, 'a4');

    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes a quote that would break out of an attribute', () => {
    const html = receiptHtml({ ...BASE, merchantName: '" onload="alert(1)' });

    expect(html).not.toContain('" onload="');
    expect(html).toContain('&quot; onload=&quot;alert(1)');
  });
});
