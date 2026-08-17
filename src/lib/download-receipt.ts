/**
 * "Unduh PDF", honestly.
 *
 * No PDF is generated in the browser: pulling in a PDF renderer to reproduce a
 * document the print pipeline already produces would be a lot of bytes for a
 * worse result, and the receipt is deliberately plain HTML with its own `@page`
 * rule (see receipt-html.ts). So this opens the print dialog on the *same*
 * rendered receipt, where every browser offers "Save as PDF" as a destination.
 *
 * The button therefore reuses the receipt renderer exactly as Cetak Struk does —
 * one document, two destinations — and the UI says which destination to pick
 * rather than pretending a file appeared in the downloads folder.
 */

import { printReceipt } from '@/lib/print-receipt';

export const PDF_DESTINATION_HINT =
  'Pilih “Simpan sebagai PDF” pada tujuan cetak untuk menyimpan struk.';

export async function downloadReceiptPdf(html: string): Promise<void> {
  await printReceipt(html);
}
