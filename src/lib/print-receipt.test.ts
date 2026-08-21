/**
 * The sandbox is one attribute a refactor could drop with no visible symptom — the receipt would
 * still print.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { printReceipt } from '@/lib/print-receipt';

const FRAME_ID = 'pos-receipt-print-frame';

afterEach(() => {
  document.getElementById(FRAME_ID)?.remove();
  vi.restoreAllMocks();
});

/**
 * Hands back the frame as it is appended. jsdom implements neither focus() nor print() on the
 * frame's window, so both are stubbed before printReceipt awaits load and reaches them.
 */
function frameOnAppend(): Promise<HTMLIFrameElement> {
  return new Promise((resolve) => {
    const original = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      const appended = original(node);
      if (node instanceof HTMLIFrameElement) {
        const view = node.contentWindow;
        if (view) {
          vi.spyOn(view, 'focus').mockImplementation(() => {});
          vi.spyOn(view, 'print').mockImplementation(() => {});
        }
        resolve(node);
      }
      return appended;
    });
  });
}

describe('print frame', () => {
  it('is sandboxed without allow-scripts, so injected markup cannot run', async () => {
    const appended = frameOnAppend();

    void printReceipt('<p>struk</p>');
    const frame = await appended;
    const sandbox = frame.getAttribute('sandbox');

    expect(sandbox).not.toBeNull();
    expect(sandbox?.split(' ')).not.toContain('allow-scripts');
  });

  it('keeps the permissions the print path actually needs', async () => {
    const appended = frameOnAppend();

    void printReceipt('<p>struk</p>');
    const tokens = (await appended).getAttribute('sandbox')?.split(' ');

    // Same-origin to write the frame and print it; modals for the dialog.
    expect(tokens).toContain('allow-same-origin');
    expect(tokens).toContain('allow-modals');
  });
});
