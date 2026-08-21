/**
 * Non-money numbers, against CLAUDE.md rule 5: percentages use a comma decimal ("12,5%") and
 * thousands are grouped with dots.
 */

import { describe, expect, it } from 'vitest';

import {
  formatCount,
  formatDecimal,
  formatPercent,
  formatPercentDelta,
  formatQuantity,
  percentChange,
} from '@/lib/number';

describe('formatCount', () => {
  it('groups thousands with dots', () => {
    expect(formatCount(1250)).toBe('1.250');
    expect(formatCount(3420)).toBe('3.420');
    expect(formatCount(1000000)).toBe('1.000.000');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(0)).toBe('0');
  });

  it('keeps the sign and truncates a stray float', () => {
    expect(formatCount(-1250)).toBe('-1.250');
    expect(formatCount(12.7)).toBe('12');
  });

  it('renders a dash for a non-finite value rather than NaN', () => {
    expect(formatCount(Number.NaN)).toBe('—');
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatDecimal', () => {
  it('uses a comma decimal and dot thousands', () => {
    expect(formatDecimal(12.5, 1)).toBe('12,5');
    expect(formatDecimal(1234.56, 2)).toBe('1.234,56');
  });

  it('trims trailing zeros by default and keeps them on request', () => {
    expect(formatDecimal(12, 1)).toBe('12');
    expect(formatDecimal(12.0, 2)).toBe('12');
    expect(formatDecimal(12, 2, { trimTrailingZeros: false })).toBe('12,00');
  });

  it('rounds at the requested precision', () => {
    expect(formatDecimal(3.25, 1)).toBe('3,3');
    expect(formatDecimal(3.24, 1)).toBe('3,2');
  });

  it('does not render a negative zero', () => {
    expect(formatDecimal(-0.04, 1)).toBe('0');
  });
});

describe('percentages', () => {
  it('appends the sign to a comma decimal', () => {
    expect(formatPercent(12.5)).toBe('12,5%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(-3.25)).toBe('-3,3%');
  });

  it('marks direction explicitly for deltas', () => {
    expect(formatPercentDelta(12.5)).toBe('+12,5%');
    expect(formatPercentDelta(-8)).toBe('-8%');
    // Zero gets no sign: there is no direction to report.
    expect(formatPercentDelta(0)).toBe('0%');
  });

  it('computes change, and refuses to invent one without a baseline', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(100, 100)).toBe(0);
    // No baseline means no percentage — the caller shows "Baru" instead of 100%.
    expect(percentChange(100, 0)).toBeNull();
    expect(percentChange(Number.NaN, 100)).toBeNull();
  });

  it('measures against the magnitude of the baseline when it is negative', () => {
    expect(percentChange(-50, -100)).toBe(50);
  });

  it('renders a dash for a non-finite percentage', () => {
    expect(formatPercent(Number.NaN)).toBe('—');
    expect(formatPercentDelta(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatQuantity', () => {
  it('appends a unit when there is one', () => {
    expect(formatQuantity(1250, 'pcs')).toBe('1.250 pcs');
    expect(formatQuantity(1250)).toBe('1.250');
  });
});
