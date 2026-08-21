/** Non-money number formatting. CLAUDE.md rule 5: percentages use a comma decimal ("12,5%"). */

/** Group digits with "." every three. */
function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Format a number with a comma decimal and dot thousands separators. */
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

/** Percentage with a comma decimal. */
export function formatPercent(value: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${formatDecimal(value, maximumFractionDigits)}%`;
}

/** Signed percentage for deltas, where direction is the point. */
export function formatPercentDelta(value: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(value)) return '—';
  const formatted = formatPercent(value, maximumFractionDigits);
  return value > 0 ? `+${formatted}` : formatted;
}

/** Percentage change from `previous` to `current`, as a number. */
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
