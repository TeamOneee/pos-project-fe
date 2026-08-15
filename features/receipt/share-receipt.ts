/**
 * Sharing on native: render the receipt to a PDF, then hand it to the share
 * sheet. The web implementation lives alongside in share-receipt.web.ts.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type ShareOutcome = 'shared' | 'unsupported' | 'failed';

/** Native share sheets are always present; the real check happens on use. */
export function isShareAvailable(): boolean {
  return true;
}

export async function shareReceipt(html: string, _summary: string): Promise<ShareOutcome> {
  try {
    if (!(await Sharing.isAvailableAsync())) return 'unsupported';

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Bagikan struk',
      UTI: 'com.adobe.pdf',
    });

    return 'shared';
  } catch {
    // A cancelled share sheet throws on some platforms; nothing to report.
    return 'failed';
  }
}
