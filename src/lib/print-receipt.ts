/**
 * Printing on web.
 *
 * The receipt is written into an off-screen iframe and that frame is printed,
 * rather than printing the page behind a `@media print` rule that hides the
 * app. Two reasons: the receipt carries its own `@page { size: 80mm auto }`,
 * which only applies to the document being printed, and hiding an entire SPA
 * for print is fragile — anything portalled outside the root, a dialog
 * included, escapes the rule and prints over the receipt.
 */

const FRAME_ID = 'pos-receipt-print-frame';

export async function printReceipt(html: string): Promise<void> {
  if (typeof document === 'undefined') return;

  // A frame left over from a previous print would otherwise accumulate.
  document.getElementById(FRAME_ID)?.remove();

  const frame = document.createElement('iframe');
  frame.id = FRAME_ID;
  frame.setAttribute('aria-hidden', 'true');
  // Off-screen rather than display:none — a hidden frame does not paint, and
  // some browsers will print it blank.
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';

  document.body.appendChild(frame);

  const contentWindow = frame.contentWindow;
  const contentDocument = frame.contentDocument ?? contentWindow?.document;
  if (!contentWindow || !contentDocument) {
    frame.remove();
    return;
  }

  await new Promise<void>((resolve) => {
    frame.addEventListener('load', () => resolve(), { once: true });

    contentDocument.open();
    contentDocument.write(html);
    contentDocument.close();

    // Some browsers fire load before the listener attaches on a written
    // document; this keeps the promise from hanging.
    if (contentDocument.readyState === 'complete') resolve();
  });

  contentWindow.focus();
  contentWindow.print();

  // The dialog is modal but print() can return before it closes, so the frame
  // is cleared on the next tick rather than immediately.
  window.setTimeout(() => frame.remove(), 1000);
}
