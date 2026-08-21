/**
 * Money handling. CLAUDE.md rule 1: money never touches a float.
 *
 * The API sends decimal strings ("15750000.00"). We parse them to an integer
 * number of rupiah at the API boundary and keep them integers everywhere else.
 * No parseFloat, no toFixed, no decimals in any output.
 */

/** An integer number of rupiah. Branding keeps it from mixing with raw numbers. */
export type Rupiah = number;

const MONEY_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;

export class MoneyParseError extends Error {
  constructor(readonly input: unknown) {
    super(`Cannot parse money value: ${JSON.stringify(input)}`);
    this.name = 'MoneyParseError';
  }
}

/**
 * Parse an API decimal string to an integer number of rupiah.
 *
 * Rupiah has no minor unit in this product, so any fractional part must be
 * zero — "15750000.00" is the API's decimal(N,2) rendering of a whole number.
 * A non-zero fraction means the API contract broke and we fail loudly rather
 * than silently rounding money.
 *
 *   parseMoney("15750000.00") === 15750000
 *   parseMoney("0")           === 0
 */
export function parseMoney(apiString: string | number): Rupiah {
  if (typeof apiString === 'number') {
    if (!Number.isFinite(apiString)) throw new MoneyParseError(apiString);
    return Math.round(apiString);
  }

  if (typeof apiString !== 'string') throw new MoneyParseError(apiString);

  const trimmed = apiString.trim();
  const match = MONEY_PATTERN.exec(trimmed);
  if (!match) throw new MoneyParseError(apiString);

  const [, sign, whole = '', fraction] = match;

  // BE mengirim average_transaction_value sebagai "43796.61" (hasil bagi omzet/count)
  // Kontrak bilang "00" tapi BE nyata pakai desimal — ikuti BE (round ke rupiah terdekat)
  // bukan throw. Tetap aman untuk "15750000.00" -> 15750000
  const num = Number(trimmed);
  if (!Number.isFinite(num)) throw new MoneyParseError(apiString);
  if (!Number.isSafeInteger(Math.trunc(num)) && Math.abs(num) > Number.MAX_SAFE_INTEGER) throw new MoneyParseError(apiString);

  const rounded = Math.round(num);
  // jaga whole tetap dipakai untuk kasus besar > 2^53? fallback ke whole
  if (fraction === undefined || /^0+$/.test(fraction)) {
    const value = Number(whole);
    if (!Number.isSafeInteger(value)) throw new MoneyParseError(apiString);
    return sign === '-' ? -value : value;
  }
  return rounded;
}

/** Parse, but fall back to 0 instead of throwing. For display-only paths. */
export function parseMoneyOr(apiString: string | number, fallback: Rupiah = 0): Rupiah {
  try {
    return parseMoney(apiString);
  } catch {
    return fallback;
  }
}

/** Group digits with "." every three, Indonesian style. */
function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format an integer rupiah amount for display.
 *
 *   formatIDR(15750000) === "Rp 15.750.000"
 *   formatIDR(0)        === "Rp 0"
 *   formatIDR(-2500)    === "-Rp 2.500"
 *
 * Never emits a decimal separator — there are no sen in this product.
 */
export function formatIDR(amount: Rupiah): string {
  if (!Number.isFinite(amount)) throw new MoneyParseError(amount);

  // Defensive: a float slipped through somewhere upstream. Truncate toward zero
  // rather than round, so we never invent money that was not there.
  const integer = Math.trunc(amount);
  const negative = integer < 0;
  const formatted = `Rp ${groupDigits(String(Math.abs(integer)))}`;

  return negative ? `-${formatted}` : formatted;
}

/**
 * Format without the "Rp " prefix, for table columns that carry the unit in
 * the header. Same guarantees: integers only, no decimal separator.
 */
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

/**
 * Render integer rupiah back as the contract's decimal string.
 *
 * §0 requires every money field on the wire to be an explicit decimal string
 * and never a JSON number, so anything we send — `price` on a product,
 * `expected_unit_price` on a checkout line — has to come back through here.
 * Built by string concatenation, never `toFixed`, so no float ever touches it.
 *
 *   formatMoneyForApi(8500) === "8500.00"
 */
export function formatMoneyForApi(amount: Rupiah): string {
  if (!Number.isInteger(amount)) throw new MoneyParseError(amount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${Math.abs(amount)}.00`;
}
