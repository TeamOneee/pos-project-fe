/**
 * The printable receipt: 80mm thermal width, monospaced, black on white.
 *
 * Plain HTML rather than a rendered component, because both consumers want a
 * document — the print path writes it into a frame, the PDF path renders it.
 *
 * Nothing here reads a design token: a thermal printer has one colour and no
 * webfont, and a receipt that depends on the app's theme would print wrong.
 *
 * **On sizing.** The receipt is a fixed 80mm column that centres itself on
 * whatever paper the printer reports. That covers both destinations without
 * choosing between them: on an 80mm roll the column fills the page exactly, and
 * on A4 — which is what "Simpan sebagai PDF" hands us — it lands in the middle
 * of the sheet instead of stranded in a corner.
 *
 * It deliberately does *not* declare `size: 80mm auto`. That is invalid CSS —
 * `size` takes one or two lengths, or the single keyword `auto`, never a mix —
 * so the whole declaration was dropped, the page fell back to A4, and the
 * receipt printed as a small block in the top-left. Naming a length instead
 * would force every short receipt to feed and waste most of a page of thermal
 * paper, so the width is expressed in the body and the page is left `auto`.
 *
 * Widths are in millimetres, not pixels: a print job is not rendered at 96dpi,
 * so 302px is only accidentally 80mm.
 */

import type { ReceiptData } from '@/lib/receipt-data';
import { formatDateTime } from '@/lib/date';
import { render, safeHtml } from '@/lib/html';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

/** The roll this is cut for. 58mm rolls print the same column, narrower. */
export const RECEIPT_WIDTH_MM = 80;

export function receiptHtml(receipt: ReceiptData): string {
  const lines = receipt.lines.map(
    (line) => safeHtml`
      <div class="item">
        <div class="item-name">${line.name}</div>
        <div class="item-row">
          <span>${formatCount(line.quantity)} × ${formatIDR(line.unitPrice)}</span>
          <span>${formatIDR(line.subtotal)}</span>
        </div>
      </div>`
  );

  // A reprint from S-22 knows the method but not what was handed over — cash
  // received is not persisted — so it names the method instead of claiming the
  // sale was non-cash. At checkout, where `received` is always known for a cash
  // sale, this renders exactly as it did before.
  const cashRows =
    receipt.method === 'CASH'
      ? receipt.received !== null
        ? safeHtml`
      <div class="row"><span>Tunai</span><span>${formatIDR(receipt.received)}</span></div>
      <div class="row"><span>Kembalian</span><span>${formatIDR(receipt.change ?? 0)}</span></div>`
        : safeHtml`<div class="row"><span>Metode</span><span>Tunai</span></div>`
      : safeHtml`<div class="row"><span>Metode</span><span>Non-Tunai</span></div>`;

  return render(safeHtml`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${receipt.transactionNumber}</title>
<style>
  /* Whatever paper the printer reports; the column centres inside it. */
  @page { margin: 0; }

  html {
    background: #fff;
    /* Pure black throughout. A thermal head has one dot and no grey, so a
       "muted" tone dithers into a smudge rather than reading as secondary —
       hierarchy here is size and weight only. */
    color: #000;
  }

  body {
    width: ${RECEIPT_WIDTH_MM}mm;
    margin: 0 auto;
    padding: 5mm 4mm 7mm;
    box-sizing: border-box;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11.5pt;
    line-height: 1.5;
    -webkit-font-smoothing: none;
  }

  header { text-align: center; margin-bottom: 4mm; }

  .merchant {
    font-size: 14pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    word-break: break-word;
  }

  .outlet { font-size: 10.5pt; }

  /* Dashed between sections, solid where the eye should stop: around the
     figures a customer checks. */
  .rule { border-top: 1px dashed #000; margin: 3mm 0; }
  .rule-strong { border-top: 2px solid #000; margin: 3mm 0; }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 3mm;
  }

  /* Amounts share a column: same width, right-aligned, figures lined up. */
  .row > :last-child { text-align: right; white-space: nowrap; }

  .meta { font-size: 10.5pt; }
  .meta .row > :first-child { min-width: 16mm; }

  .item + .item { margin-top: 2.5mm; }
  .item-name { word-break: break-word; }
  .item-row { display: flex; justify-content: space-between; gap: 3mm; }
  .item-row > :last-child { text-align: right; white-space: nowrap; }

  .total {
    font-size: 14pt;
    font-weight: 700;
    margin-top: 1mm;
  }

  footer {
    text-align: center;
    margin-top: 5mm;
    font-size: 10.5pt;
  }
</style>
</head>
<body>
  <header>
    <div class="merchant">${receipt.merchantName}</div>
    <div class="outlet">${receipt.outletName}</div>
  </header>

  <div class="rule"></div>

  <div class="meta">
    <div class="row"><span>No.</span><span>${receipt.transactionNumber}</span></div>
    <div class="row"><span>Waktu</span><span>${formatDateTime(receipt.issuedAt)}</span></div>
    <div class="row"><span>Kasir</span><span>${receipt.cashierName}</span></div>
  </div>

  <div class="rule"></div>

  ${lines}

  <div class="rule-strong"></div>

  <div class="row"><span>Subtotal</span><span>${formatIDR(receipt.subtotal)}</span></div>
  <div class="row total"><span>Total</span><span>${formatIDR(receipt.total)}</span></div>

  <div class="rule-strong"></div>

  ${cashRows}

  <footer>Terima kasih atas kunjungan Anda</footer>
</body>
</html>`);
}
