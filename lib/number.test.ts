import {
  formatCount,
  formatDecimal,
  formatPercent,
  formatPercentDelta,
  formatQuantity,
  percentChange,
} from '@/lib/number';

describe('formatPercent', () => {
  it('uses a comma decimal, per CLAUDE.md rule 5', () => {
    expect(formatPercent(12.5)).toBe('12,5%');
  });

  it('never uses a dot as the decimal separator', () => {
    for (const value of [12.5, 0.5, 99.9, 1234.5, -8.25]) {
      expect(formatPercent(value)).not.toMatch(/\d\.\d(?!\d{2})/);
    }
  });

  it.each([
    [0, '0%'],
    [1, '1%'],
    [12.5, '12,5%'],
    [50, '50%'],
    [99.9, '99,9%'],
    [100, '100%'],
    [-3.25, '-3,3%'],
    [-8, '-8%'],
  ])('formats %f as %s', (input, expected) => {
    expect(formatPercent(input)).toBe(expected);
  });

  it('trims trailing zeros so whole percentages stay clean', () => {
    expect(formatPercent(12.0)).toBe('12%');
    expect(formatPercent(12.5, 2)).toBe('12,5%');
  });

  it('honours a wider fraction setting', () => {
    expect(formatPercent(12.345, 2)).toBe('12,35%');
    expect(formatPercent(0.125, 3)).toBe('0,125%');
  });

  it('groups thousands with dots', () => {
    expect(formatPercent(1234.5)).toBe('1.234,5%');
  });

  it('renders an em dash for non-finite input', () => {
    expect(formatPercent(NaN)).toBe('—');
    expect(formatPercent(Infinity)).toBe('—');
  });
});

describe('formatPercentDelta', () => {
  it('signs positives explicitly', () => {
    expect(formatPercentDelta(12.5)).toBe('+12,5%');
    expect(formatPercentDelta(8)).toBe('+8%');
  });

  it('leaves negatives and zero unsigned beyond the minus', () => {
    expect(formatPercentDelta(-8)).toBe('-8%');
    expect(formatPercentDelta(-12.5)).toBe('-12,5%');
    expect(formatPercentDelta(0)).toBe('0%');
  });
});

describe('formatDecimal', () => {
  it.each([
    [12.5, 1, '12,5'],
    [1234.56, 2, '1.234,56'],
    [12, 1, '12'],
    [0, 1, '0'],
    [0.5, 1, '0,5'],
    [1000000.25, 2, '1.000.000,25'],
    [-1234.5, 1, '-1.234,5'],
  ])('formats %f with %i fraction digits as %s', (value, digits, expected) => {
    expect(formatDecimal(value, digits)).toBe(expected);
  });

  it('keeps trailing zeros when asked', () => {
    expect(formatDecimal(12, 2, { trimTrailingZeros: false })).toBe('12,00');
    expect(formatDecimal(12.5, 2, { trimTrailingZeros: false })).toBe('12,50');
  });

  it('does not render "-0"', () => {
    expect(formatDecimal(-0.04, 1)).toBe('0');
  });
});

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1.000'],
    [1250, '1.250'],
    [1000000, '1.000.000'],
    [-1250, '-1.250'],
  ])('formats %i as %s', (input, expected) => {
    expect(formatCount(input)).toBe(expected);
  });

  it('never shows a fraction for a count', () => {
    expect(formatCount(1250.9)).toBe('1.250');
    expect(formatCount(1250.9)).not.toContain(',');
  });

  it('appends a unit when given one', () => {
    expect(formatQuantity(1250, 'pcs')).toBe('1.250 pcs');
    expect(formatQuantity(1250)).toBe('1.250');
  });
});

describe('percentChange', () => {
  it('computes the change between two periods', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(100, 100)).toBe(0);
  });

  it('returns null when there is no baseline, rather than a fake 100%', () => {
    expect(percentChange(150, 0)).toBeNull();
    expect(percentChange(150, NaN)).toBeNull();
  });

  it('feeds the delta formatter end to end', () => {
    const change = percentChange(112.5, 100);
    expect(change).not.toBeNull();
    expect(formatPercentDelta(change as number)).toBe('+12,5%');
  });
});
