/**
 * The printable receipt. It leaves the app as a document, so the checks here
 * are the ones a thermal printer cannot forgive: correct money, correct width,
 * and nothing between Subtotal and Total.
 */

import type { ReceiptData } from '@/features/receipt/receipt-data';
import { receiptHtml, RECEIPT_WIDTH_PX } from '@/features/receipt/receipt-html';

const RECEIPT: ReceiptData = {
  merchantName: 'IndoMart Retail',
  outletName: 'Outlet A - Mall Central',
  cashierName: 'Budi Santoso',
  transactionNumber: 'TRX-20260813-002',
  issuedAt: '2026-08-13T14:35:00.000Z',
  lines: [
    { name: 'Coca Cola 1.5L', quantity: 2, unitPrice: 15_000, subtotal: 30_000 },
    { name: 'Sprite 1.5L', quantity: 1, unitPrice: 15_000, subtotal: 15_000 },
  ],
  subtotal: 45_000,
  total: 45_000,
  method: 'CASH',
  received: 50_000,
  change: 5_000,
};

describe('money on the receipt', () => {
  it('prints rupiah the Indonesian way, with no decimals anywhere', () => {
    const html = receiptHtml(RECEIPT);

    expect(html).toContain('Rp 45.000');
    expect(html).toContain('Rp 30.000');
    // A decimal separator on a receipt is a bug that reaches the customer.
    expect(html).not.toMatch(/Rp\s[\d.]+,\d/);
    expect(html).not.toContain('45000.00');
  });

  it('carries the cash tendered and the change', () => {
    const html = receiptHtml(RECEIPT);

    expect(html).toContain('Tunai');
    expect(html).toContain('Rp 50.000');
    expect(html).toContain('Kembalian');
    expect(html).toContain('Rp 5.000');
  });

  it('says Non-Tunai instead when it was not cash', () => {
    const html = receiptHtml({ ...RECEIPT, method: 'NON_CASH', received: null, change: null });

    expect(html).toContain('Non-Tunai');
    expect(html).not.toContain('Kembalian');
  });
});

describe('structure', () => {
  it('has a subtotal and a total, and nothing between them', () => {
    const html = receiptHtml(RECEIPT);

    const subtotalAt = html.indexOf('Subtotal');
    const totalAt = html.indexOf('>Total<');
    expect(subtotalAt).toBeGreaterThan(-1);
    expect(totalAt).toBeGreaterThan(subtotalAt);

    // Rule 2: no discount, tax or service charge may ever appear here.
    const between = html.slice(subtotalAt, totalAt);
    expect(between).not.toMatch(/diskon|pajak|ppn|service|biaya/i);
  });

  it('carries the header a customer needs to identify the sale', () => {
    const html = receiptHtml(RECEIPT);

    expect(html).toContain('IndoMart Retail');
    expect(html).toContain('Outlet A - Mall Central');
    expect(html).toContain('Budi Santoso');
    expect(html).toContain('TRX-20260813-002');
    expect(html).toContain('13 Agu 2026');
  });

  it('lists every line with its quantity and its own subtotal', () => {
    const html = receiptHtml(RECEIPT);

    expect(html).toContain('Coca Cola 1.5L');
    expect(html).toContain('2 × Rp 15.000');
    expect(html).toContain('Sprite 1.5L');
  });

  it('thanks the customer', () => {
    expect(receiptHtml(RECEIPT)).toContain('Terima kasih atas kunjungan Anda');
  });
});

describe('print geometry', () => {
  it('sizes the page for an 80mm roll with no margins', () => {
    const html = receiptHtml(RECEIPT);

    expect(html).toContain('@page { size: 80mm auto; margin: 0; }');
    expect(html).toContain(`width: ${RECEIPT_WIDTH_PX}px`);
    expect(RECEIPT_WIDTH_PX).toBe(302);
  });

  it('uses a monospaced face, not the app font', () => {
    // A thermal printer has no webfont to fall back on.
    expect(receiptHtml(RECEIPT)).toContain('monospace');
  });
});

describe('escaping', () => {
  it('does not let a product name break the document', () => {
    const html = receiptHtml({
      ...RECEIPT,
      merchantName: 'Toko <script>alert(1)</script> & Co',
      lines: [{ name: 'Kopi "Spesial"', quantity: 1, unitPrice: 1_000, subtotal: 1_000 }],
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp; Co');
    expect(html).toContain('&quot;Spesial&quot;');
  });
});
