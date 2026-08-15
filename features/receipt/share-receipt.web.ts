/**
 * Sharing on web.
 *
 * expo-sharing has no web implementation, so this uses the Web Share API when
 * the browser offers it and reports back honestly when it does not — the
 * caller disables the button rather than showing one that does nothing.
 *
 * A PDF is not generated here: producing one in the browser would mean pulling
 * in a renderer for a path that Chrome on desktop cannot use anyway. The text
 * summary carries the transaction number, which is what a shared receipt is
 * actually for.
 */

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
