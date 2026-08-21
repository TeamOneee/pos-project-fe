/** Money handling. CLAUDE.md rule 1: money never touches a float. */

/** An integer number of rupiah. Branding keeps it from mixing with raw numbers. */
export type Rupiah = number;

const MONEY_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;

export class MoneyParseError extends Error {
  constructor(readonly input: unknown) {
    super(`Cannot parse money value: ${JSON.stringify(input)}`);
    this.name = 'MoneyParseError';
  }
}

/** Parse an API decimal string to an integer number of rupiah. */
export function parseMoney(apiString: string | number): Rupiah {
  if (typeof apiString === 'number') {
    if (!Number.isInteger(apiString)) throw new MoneyParseError(apiString);
    return apiString;
  }

  if (typeof apiString !== 'string') throw new MoneyParseError(apiString);

  const match = MONEY_PATTERN.exec(apiString.trim());
  if (!match) throw new MoneyParseError(apiString);

  const [, sign, whole = '', fraction] = match;

  // String comparison, never parseFloat: "00" is zero, "5" is not.
  if (fraction !== undefined && /[^0]/.test(fraction)) {
    throw new MoneyParseError(apiString);
  }

  // The integer part is safe for Number() — it has no fractional component, so no binary-float
  // rounding can occur below Number.MAX_SAFE_INTEGER.
  const value = Number(whole);
  if (!Number.isSafeInteger(value)) throw new MoneyParseError(apiString);

  return sign === '-' ? -value : value;
}

/** Parse, but fall back to 0 instead of throwing. For display-only paths. */
export function parseMoneyOr(apiString: string | number, fallback: Rupiah = 0): Rupiah {
  try {
    return parseMoney(apiString);
  } catch {
    return fallback;
  }
}

/** Lenient variant for computed averages (e.g. average_transaction_value). */
export function parseMoneyLenient(apiString: string | number): Rupiah {
  if (typeof apiString === 'number') {
    if (!Number.isFinite(apiString)) throw new MoneyParseError(apiString);
    return Math.round(apiString);
  }

  if (typeof apiString !== 'string') throw new MoneyParseError(apiString);

  const trimmed = apiString.trim();
  const match = MONEY_PATTERN.exec(trimmed);
  if (!match) throw new MoneyParseError(apiString);

  const [, sign, whole = '', fraction] = match;

  // Fast path: exact rupiah already.
  if (fraction === undefined || /^0+$/.test(fraction)) {
    const value = Number(whole);
    if (!Number.isSafeInteger(value)) throw new MoneyParseError(apiString);
    return sign === '-' ? -value : value;
  }

  // Fractional rupiah — round to nearest integer (BE's average).
  const num = Number(trimmed);
  if (!Number.isFinite(num)) throw new MoneyParseError(apiString);
  const rounded = Math.round(num);
  if (!Number.isSafeInteger(rounded)) throw new MoneyParseError(apiString);
  return rounded;
}

/** Group digits with "." every three, Indonesian style. */
function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Format an integer rupiah amount for display. */
export function formatIDR(amount: Rupiah): string {
  if (!Number.isFinite(amount)) throw new MoneyParseError(amount);

  // Defensive: a float slipped through somewhere upstream. Truncate toward zero rather than round,
  // so we never invent money that was not there.
  const integer = Math.trunc(amount);
  const negative = integer < 0;
  const formatted = `Rp ${groupDigits(String(Math.abs(integer)))}`;

  return negative ? `-${formatted}` : formatted;
}

/** Format without the "Rp " prefix, for table columns that carry the unit in the header. */
export function formatIDRCompactUnit(amount: Rupiah): string {
  return formatIDR(amount).replace(/^(-?)Rp /, '$1');
}

/** Sum integer rupiah safely. Total = subtotal (CLAUDE.md rule 2). */
export function sumRupiah(amounts: readonly Rupiah[]): Rupiah {
  return amounts.reduce<Rupiah>((total, amount) => total + Math.trunc(amount), 0);
}

/** Line total for a cart row: integer price times integer quantity. */
export function lineTotal(unitPrice: Rupiah, quantity: number): Rupiah {
  return Math.trunc(unitPrice) * Math.trunc(quantity);
}

/** Render integer rupiah back as the contract's decimal string. */
export function formatMoneyForApi(amount: Rupiah): string {
  if (!Number.isInteger(amount)) throw new MoneyParseError(amount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${Math.abs(amount)}.00`;
}
