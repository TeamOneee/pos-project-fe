/**
 * HTML escaped by construction, for the app's one markup-as-a-string: the
 * printed receipt (receipt-html.ts). `safeHtml` escapes every `${}`; `raw` is
 * the explicit, greppable way out. Nested fragments escape once, not twice.
 *
 * Not named `html`: Prettier reformats that tag as embedded HTML, rewriting the
 * receipt's whitespace and its snapshot on every save.
 */

/** Markup already escaped, or authored as a literal. */
export type SafeHtml = { readonly kind: 'safe-html'; readonly value: string };

/**
 * Text and *quoted* attribute contexts only — not unquoted attributes, not
 * `<script>`/`<style>` bodies, not URL positions (those need a scheme check).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Exempts a string from escaping. Only for markup this codebase authored. */
export function raw(value: string): SafeHtml {
  return { kind: 'safe-html', value };
}

function isSafeHtml(value: unknown): value is SafeHtml {
  return typeof value === 'object' && value !== null && (value as SafeHtml).kind === 'safe-html';
}

function interpolate(value: unknown): string {
  if (isSafeHtml(value)) return value.value;
  // A missing field leaves a blank, not "undefined".
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(interpolate).join('');
  return escapeHtml(String(value));
}

/** Escapes every interpolation; SafeHtml passes through, arrays are joined. */
export function safeHtml(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0];
  for (let index = 0; index < values.length; index += 1) {
    out += interpolate(values[index]) + strings[index + 1];
  }
  return raw(out);
}

/** Unwraps to the string a sink consumes. */
export function render(node: SafeHtml): string {
  return node.value;
}
