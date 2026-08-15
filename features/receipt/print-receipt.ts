/**
 * Printing on native: hand the HTML to the OS print dialog.
 *
 * The web implementation lives in print-receipt.web.ts; Metro picks it by
 * platform.
 */

import * as Print from 'expo-print';

export async function printReceipt(html: string): Promise<void> {
  await Print.printAsync({ html });
}
