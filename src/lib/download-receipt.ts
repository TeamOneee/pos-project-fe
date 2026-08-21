/** "Unduh PDF", honestly. */

import { printReceipt } from '@/lib/print-receipt';

export const PDF_DESTINATION_HINT =
  'Pilih “Simpan sebagai PDF” pada tujuan cetak untuk menyimpan struk.';

export async function downloadReceiptPdf(html: string): Promise<void> {
  await printReceipt(html);
}
