/** Sharing on web. */

export type ShareOutcome = 'shared' | 'unsupported' | 'failed';

/** Desktop Chrome has no Web Share API, so the button is disabled there. */
export function isShareAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareReceipt(_html: string, summary: string): Promise<ShareOutcome> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }

  try {
    await navigator.share({ title: 'Struk transaksi', text: summary });
    return 'shared';
  } catch (error) {
    // The user dismissing the sheet lands here; it is not a failure to report.
    if (error instanceof Error && error.name === 'AbortError') return 'shared';
    return 'failed';
  }
}
