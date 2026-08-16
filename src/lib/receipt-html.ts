/**
 * The printable receipt: 80mm thermal width, monospaced, black on white.
 *
 * Plain HTML rather than a rendered component, because both consumers want a
 * document — the print path writes it into a frame. It carries its own `@page`
 * sizing so the printer does not impose margins a 58mm/80mm roll does not
 * have.
 *
 * Nothing here reads a design token: a thermal printer has one colour and no
 * webfont, and a receipt that depends on the app's theme would print wrong.
 */

import type { ReceiptData } from '@/lib/receipt-data';
import { formatDateTime } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

/** 80mm at 96dpi. The on-screen preview uses the same number. */
export const RECEIPT_WIDTH_PX = 302;

export function receiptHtml(receipt: ReceiptData): string {
  const lines = receipt.lines
    .map(
      (line) => `
      <div class="item">
        <div class="item-name">${escapeHtml(line.name)}</div>
        <div class="item-row">
          <span>${formatCount(line.quantity)} × ${formatIDR(line.unitPrice)}</span>
          <span>${formatIDR(line.subtotal)}</span>
        </div>
      </div>`
    )
    .join('');

  const cashRows =
    receipt.method === 'CASH' && receipt.received !== null
      ? `
      <div class="row"><span>Tunai</span><span>${formatIDR(receipt.received)}</span></div>
      <div class="row"><span>Kembalian</span><span>${formatIDR(receipt.change ?? 0)}</span></div>`
      : `<div class="row"><span>Metode</span><span>Non-Tunai</span></div>`;

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(receipt.transactionNumber)}</title>
<style>
  /* 80mm roll, no printer margins. */
  @page { size: 80mm auto; margin: 0; }

  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
  }

  body {
    width: ${RECEIPT_WIDTH_PX}px;
    padding: 12px;
    box-sizing: border-box;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.45;
  }

  .center { text-align: center; }
  .bold { font-weight: 700; }
  .muted { color: #333; }

  header { text-align: center; margin-bottom: 8px; }
  header .merchant { font-size: 15px; font-weight: 700; }

  .divider { border-top: 1px dashed #000; margin: 8px 0; }

  .row { display: flex; justify-content: space-between; gap: 8px; }

  .item { margin-bottom: 6px; }
  .item-name { word-break: break-word; }
  .item-row { display: flex; justify-content: space-between; gap: 8px; }

  .total { font-size: 15px; font-weight: 700; }

  footer { text-align: center; margin-top: 10px; }
</style>
</head>
<body>
  <header>
    <div class="merchant">${escapeHtml(receipt.merchantName)}</div>
    <div class="muted">${escapeHtml(receipt.outletName)}</div>
  </header>

  <div class="row"><span>No.</span><span>${escapeHtml(receipt.transactionNumber)}</span></div>
  <div class="row"><span>Waktu</span><span>${escapeHtml(formatDateTime(receipt.issuedAt))}</span></div>
  <div class="row"><span>Kasir</span><span>${escapeHtml(receipt.cashierName)}</span></div>

  <div class="divider"></div>

  ${lines}

  <div class="divider"></div>

  <div class="row"><span>Subtotal</span><span>${formatIDR(receipt.subtotal)}</span></div>
  <div class="row total"><span>Total</span><span>${formatIDR(receipt.total)}</span></div>

  <div class="divider"></div>

  ${cashRows}

  <footer>Terima kasih atas kunjungan Anda</footer>
</body>
</html>`;
}

/** Receipt data is merchant-controlled, but it still ends up in a document. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
