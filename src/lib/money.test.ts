/**
 * Money, the rule the whole product rests on (CLAUDE.md rule 1): it never
 * touches a float, and no output ever shows a decimal.
 *
 * The parse cases are the interesting ones. The API sends `decimal(N,2)` strings,
 * so "15750000.00" has to become the integer 15750000 — and a *non-zero* fraction
 * has to fail loudly rather than round, because silently turning 100.50 into 100
 * or 101 is inventing or destroying money.
 */

import { describe, expect, it } from 'vitest';

import {
  formatIDR,
  formatIDRCompactUnit,
  lineTotal,
  MoneyParseError,
  parseMoney,
  parseMoneyOr,
  sumRupiah,
} from '@/lib/money';

describe('parseMoney', () => {
  it('reads the API decimal string as integer rupiah', () => {
    expect(parseMoney('15750000.00')).toBe(15750000);
    expect(parseMoney('15000.00')).toBe(15000);
    expect(parseMoney('0.00')).toBe(0);
    expect(parseMoney('0')).toBe(0);
    expect(parseMoney('7500')).toBe(7500);
  });

  it('accepts a plain integer and rejects a float', () => {
    expect(parseMoney(15000)).toBe(15000);
    expect(() => parseMoney(150.5)).toThrow(MoneyParseError);
  });

  it('rejects a fraction that is not zero, rather than rounding money', () => {
    expect(() => parseMoney('100.50')).toThrow(MoneyParseError);
    expect(() => parseMoney('100.01')).toThrow(MoneyParseError);
    // "00" and "000" are zero, and are the contract's normal rendering.
    expect(parseMoney('100.000')).toBe(100);
  });

  it('keeps the sign', () => {
    expect(parseMoney('-2500.00')).toBe(-2500);
    expect(parseMoney('+2500.00')).toBe(2500);
  });

  it('rejects anything that is not a number', () => {
    for (const input of ['', 'Rp 15.000', '15,000', 'abc', '1e5', null, undefined, {}]) {
      expect(() => parseMoney(input as string)).toThrow(MoneyParseError);
    }
  });

  it('refuses a value beyond safe-integer precision', () => {
    expect(() => parseMoney('9007199254740993')).toThrow(MoneyParseError);
  });

  it('falls back instead of throwing on the display-only path', () => {
    expect(parseMoneyOr('nonsense')).toBe(0);
    expect(parseMoneyOr('nonsense', 42)).toBe(42);
    expect(parseMoneyOr('15000.00', 42)).toBe(15000);
  });
});

describe('formatIDR', () => {
  it('formats with dot thousands and no decimals', () => {
    expect(formatIDR(15750000)).toBe('Rp 15.750.000');
    expect(formatIDR(15000)).toBe('Rp 15.000');
    expect(formatIDR(999)).toBe('Rp 999');
    expect(formatIDR(1000)).toBe('Rp 1.000');
    expect(formatIDR(0)).toBe('Rp 0');
  });

  it('puts the minus outside the prefix', () => {
    expect(formatIDR(-2500)).toBe('-Rp 2.500');
  });

  it('never emits a decimal separator, even for a float that slipped through', () => {
    // Truncates toward zero: it must not invent money that was not there.
    expect(formatIDR(1500.9)).toBe('Rp 1.500');
    expect(formatIDR(-1500.9)).toBe('-Rp 1.500');
    expect(formatIDR(15000)).not.toMatch(/[,.]\d{1,2}$/);
  });

  it('drops the prefix for columns that carry the unit in the header', () => {
    expect(formatIDRCompactUnit(15750000)).toBe('15.750.000');
    expect(formatIDRCompactUnit(-2500)).toBe('-2.500');
  });

  it('throws on a non-finite amount rather than printing NaN', () => {
    expect(() => formatIDR(Number.NaN)).toThrow(MoneyParseError);
    expect(() => formatIDR(Number.POSITIVE_INFINITY)).toThrow(MoneyParseError);
  });
});

describe('arithmetic', () => {
  it('sums integer rupiah exactly', () => {
    expect(sumRupiah([15000, 30000, 7500])).toBe(52500);
    expect(sumRupiah([])).toBe(0);
    // The classic float trap, in rupiah terms.
    expect(sumRupiah([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(55);
  });

  it('multiplies a line without floating point', () => {
    expect(lineTotal(15000, 2)).toBe(30000);
    expect(lineTotal(12500, 4)).toBe(50000);
    expect(lineTotal(15000, 0)).toBe(0);
  });

  it('reproduces the totals the contract quotes', () => {
    // §6's two-item cart and sample cart.
    expect(sumRupiah([lineTotal(15000, 2), lineTotal(15000, 1)])).toBe(45000);
    expect(sumRupiah([lineTotal(15000, 2), lineTotal(12500, 1), lineTotal(10000, 1)])).toBe(52500);
  });
});
