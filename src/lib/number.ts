/**
 * Non-money number formatting. CLAUDE.md rule 5: percentages use a comma
 * decimal ("12,5%"). Thousands are grouped with dots, Indonesian style.
 *
 * Money does NOT come through here — it goes through lib/money.ts, which never
 * emits a decimal separator at all.
 */

/** Group digits with "." every three. */
function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format a number with a comma decimal and dot thousands separators.
 *
 *   formatDecimal(12.5, 1)    === "12,5"
 *   formatDecimal(1234.56, 2) === "1.234,56"
 *   formatDecimal(12, 1)      === "12"   (trailing zeros trimmed by default)
 */
export function formatDecimal(
  value: number,
  maximumFractionDigits = 1,
  { trimTrailingZeros = true } = {}
): string {
  if (!Number.isFinite(value)) return '—';

  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(maximumFractionDigits);
  const [whole = '0', fraction = ''] = fixed.split('.');

  let fractionPart = fraction;
  if (trimTrailingZeros) fractionPart = fractionPart.replace(/0+$/, '');

  const formatted =
    fractionPart.length > 0 ? `${groupDigits(whole)},${fractionPart}` : groupDigits(whole);

  return negative && Number(fixed) !== 0 ? `-${formatted}` : formatted;
}

/** Whole-number count with dot grouping: formatCount(1250) === "1.250". */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const integer = Math.trunc(value);
  const formatted = groupDigits(String(Math.abs(integer)));
  return integer < 0 ? `-${formatted}` : formatted;
}

/**
 * Percentage with a comma decimal.
 *
 *   formatPercent(12.5)  === "12,5%"
 *   formatPercent(100)   === "100%"
 *   formatPercent(0)     === "0%"
 *   formatPercent(-3.25) === "-3,3%"
 */
export function formatPercent(value: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${formatDecimal(value, maximumFractionDigits)}%`;
}

/**
 * Signed percentage for deltas, where direction is the point.
 *
 *   formatPercentDelta(12.5) === "+12,5%"
 *   formatPercentDelta(-8)   === "-8%"
 *   formatPercentDelta(0)    === "0%"
 *
 * Never the only signal of direction — pair it with a label or icon
 * (CLAUDE.md rule 6).
 */
export function formatPercentDelta(value: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(value)) return '—';
  const formatted = formatPercent(value, maximumFractionDigits);
  return value > 0 ? `+${formatted}` : formatted;
}

/**
 * Percentage change from `previous` to `current`, as a number.
 * Returns null when there is no baseline to compare against — the caller
 * shows "—" or "Baru" rather than a fake 100%.
 */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Quantity with an optional unit: formatQuantity(1250, "pcs") === "1.250 pcs". */
export function formatQuantity(value: number, unit?: string): string {
  const count = formatCount(value);
  return unit ? `${count} ${unit}` : count;
}
