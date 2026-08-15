import {
  MoneyParseError,
  formatIDR,
  formatIDRCompactUnit,
  lineTotal,
  parseMoney,
  parseMoneyOr,
  sumRupiah,
} from '@/lib/money';

describe('parseMoney', () => {
  it('parses the API decimal string to an exact integer', () => {
    // The headline case: no float ever touches this value.
    expect(parseMoney('15750000.00')).toBe(15750000);
  });

  it('returns a true integer, not a near-miss float', () => {
    const value = parseMoney('15750000.00');
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toStrictEqual(15750000);
    expect(String(value)).toBe('15750000');
  });

  it.each([
    ['0', 0],
    ['0.00', 0],
    ['1', 1],
    ['999.00', 999],
    ['1000.00', 1000],
    ['15750000', 15750000],
    ['15750000.0', 15750000],
    ['15750000.000', 15750000],
    ['00015750000.00', 15750000],
    ['-2500.00', -2500],
    ['+2500.00', 2500],
  ])('parses %s to %i', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it('trims surrounding whitespace', () => {
    expect(parseMoney('  15750000.00  ')).toBe(15750000);
  });

  it('accepts an integer number unchanged', () => {
    expect(parseMoney(15750000)).toBe(15750000);
  });

  it('parses values that would lose precision as floats', () => {
    // 0.1 + 0.2 territory: these round-trip exactly because we never divide.
    expect(parseMoney('9007199254740991')).toBe(9007199254740991);
    expect(parseMoney('123456789012.00')).toBe(123456789012);
  });

  it('rejects a non-zero fractional part rather than rounding money', () => {
    expect(() => parseMoney('15750000.50')).toThrow(MoneyParseError);
    expect(() => parseMoney('0.01')).toThrow(MoneyParseError);
  });

  it('rejects malformed input', () => {
    for (const bad of [
      '',
      '   ',
      'abc',
      'Rp 15.750.000',
      '15,750,000',
      '15.750.000',
      '1e6',
      'NaN',
      'Infinity',
      '--1',
      '1.2.3',
      null,
      undefined,
      {},
      [],
      NaN,
    ]) {
      expect(() => parseMoney(bad as unknown as string)).toThrow(MoneyParseError);
    }
  });

  it('rejects a float number input', () => {
    expect(() => parseMoney(1575.5)).toThrow(MoneyParseError);
  });

  it('rejects integers beyond safe range', () => {
    expect(() => parseMoney('9007199254740993')).toThrow(MoneyParseError);
  });
});

describe('parseMoneyOr', () => {
  it('falls back instead of throwing', () => {
    expect(parseMoneyOr('nonsense')).toBe(0);
    expect(parseMoneyOr('nonsense', 42)).toBe(42);
    expect(parseMoneyOr('15750000.00', 42)).toBe(15750000);
  });
});

describe('formatIDR', () => {
  it('formats the headline amount', () => {
    expect(formatIDR(15750000)).toBe('Rp 15.750.000');
  });

  it('renders zero as "Rp 0"', () => {
    expect(formatIDR(0)).toBe('Rp 0');
  });

  it.each([
    [1, 'Rp 1'],
    [10, 'Rp 10'],
    [100, 'Rp 100'],
    [999, 'Rp 999'],
    [1000, 'Rp 1.000'],
    [10000, 'Rp 10.000'],
    [100000, 'Rp 100.000'],
    [1000000, 'Rp 1.000.000'],
    [15750, 'Rp 15.750'],
    [15750000, 'Rp 15.750.000'],
    [1234567890, 'Rp 1.234.567.890'],
  ])('formats %i as %s', (input, expected) => {
    expect(formatIDR(input)).toBe(expected);
  });

  it('puts the sign before the currency mark for negatives', () => {
    expect(formatIDR(-2500)).toBe('-Rp 2.500');
    expect(formatIDR(-15750000)).toBe('-Rp 15.750.000');
  });

  it('truncates toward zero if a float leaks in from upstream', () => {
    expect(formatIDR(15750000.99)).toBe('Rp 15.750.000');
    expect(formatIDR(-2500.99)).toBe('-Rp 2.500');
  });

  it('rejects non-finite input', () => {
    expect(() => formatIDR(NaN)).toThrow(MoneyParseError);
    expect(() => formatIDR(Infinity)).toThrow(MoneyParseError);
  });

  it('drops the prefix in the compact-unit form', () => {
    expect(formatIDRCompactUnit(15750000)).toBe('15.750.000');
    expect(formatIDRCompactUnit(0)).toBe('0');
    expect(formatIDRCompactUnit(-2500)).toBe('-2.500');
  });
});

describe('money output never shows a decimal separator', () => {
  // CLAUDE.md rule 1: no decimals are ever shown. "." is the thousands mark in
  // Indonesian, so the separator to rule out is the comma — and no trailing
  // ",00" or ".00" may survive formatting from any source.
  const amounts = [
    0,
    1,
    50,
    999,
    1000,
    1575,
    15750,
    999999,
    1000000,
    15750000,
    1234567890,
    -1,
    -15750000,
    Number.MAX_SAFE_INTEGER,
  ];

  it.each(amounts)('formatIDR(%i) has no comma and no decimal tail', (amount) => {
    const output = formatIDR(amount);
    expect(output).not.toContain(',');
    expect(output).not.toMatch(/[.,]\d{1,2}$/);
    expect(output).toMatch(/^-?Rp (\d{1,3})(\.\d{3})*$/);
  });

  it.each(amounts)('formatIDRCompactUnit(%i) has no comma and no decimal tail', (amount) => {
    const output = formatIDRCompactUnit(amount);
    expect(output).not.toContain(',');
    expect(output).toMatch(/^-?(\d{1,3})(\.\d{3})*$/);
  });

  it('holds for values parsed straight off the wire', () => {
    const wireValues = ['0.00', '1.00', '999.00', '15750000.00', '1234567890.00'];
    for (const wire of wireValues) {
      const output = formatIDR(parseMoney(wire));
      expect(output).not.toContain(',');
      expect(output).not.toMatch(/\.\d{1,2}$/);
    }
  });
});

describe('arithmetic stays integral', () => {
  it('sums without float drift', () => {
    expect(sumRupiah([15750000, 2500, 999])).toBe(15753499);
    expect(sumRupiah([])).toBe(0);

    // The classic 0.1 + 0.2 !== 0.3 failure cannot occur, because the same
    // amounts arrive as whole rupiah rather than fractions.
    const summed = sumRupiah([100, 200]);
    expect(summed).toBe(300);
    expect(Number.isInteger(summed)).toBe(true);
  });

  it('keeps line totals integral', () => {
    expect(lineTotal(15750, 3)).toBe(47250);
    expect(lineTotal(0, 10)).toBe(0);
    expect(Number.isInteger(lineTotal(15750, 3))).toBe(true);
  });

  it('formats a realistic cart without a decimal appearing anywhere', () => {
    const cart = [
      { price: parseMoney('15750.00'), qty: 3 },
      { price: parseMoney('120000.00'), qty: 1 },
      { price: parseMoney('999.00'), qty: 7 },
    ];
    const subtotal = sumRupiah(cart.map((line) => lineTotal(line.price, line.qty)));

    expect(subtotal).toBe(47250 + 120000 + 6993);
    expect(formatIDR(subtotal)).toBe('Rp 174.243');
    // Total = subtotal. Nothing else exists (CLAUDE.md rule 2).
    expect(formatIDR(subtotal)).not.toContain(',');
  });
});
