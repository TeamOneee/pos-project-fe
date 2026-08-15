import {
  formatDate,
  formatDateLong,
  formatDateTime,
  formatDateWithDay,
  formatMonthYear,
  formatRelativeDateTime,
  formatTime,
  isSameDay,
  toApiDate,
} from '@/lib/date';

/** Local-time constructor, so tests do not drift with the runner's timezone. */
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('formatDateTime', () => {
  it('renders the canonical format from CLAUDE.md', () => {
    expect(formatDateTime(at(2026, 8, 13, 14, 30))).toBe('13 Agu 2026, 14.30');
  });

  it('uses a dot, not a colon, between hours and minutes', () => {
    const output = formatDateTime(at(2026, 8, 13, 14, 30));
    expect(output).not.toContain(':');
    expect(output).toContain('14.30');
  });

  it('pads single-digit hours and minutes', () => {
    expect(formatDateTime(at(2026, 8, 13, 9, 5))).toBe('13 Agu 2026, 09.05');
    expect(formatDateTime(at(2026, 8, 1, 0, 0))).toBe('1 Agu 2026, 00.00');
  });

  it('uses a 24-hour clock with no am/pm', () => {
    expect(formatTime(at(2026, 8, 13, 0, 0))).toBe('00.00');
    expect(formatTime(at(2026, 8, 13, 12, 0))).toBe('12.00');
    expect(formatTime(at(2026, 8, 13, 23, 59))).toBe('23.59');
    expect(formatDateTime(at(2026, 8, 13, 20, 15))).not.toMatch(/[AaPp][Mm]/);
  });

  it('does not zero-pad the day of month', () => {
    expect(formatDate(at(2026, 8, 3))).toBe('3 Agu 2026');
  });
});

describe('Indonesian month names', () => {
  it.each([
    [1, 'Jan'],
    [2, 'Feb'],
    [3, 'Mar'],
    [4, 'Apr'],
    [5, 'Mei'],
    [6, 'Jun'],
    [7, 'Jul'],
    [8, 'Agu'],
    [9, 'Sep'],
    [10, 'Okt'],
    [11, 'Nov'],
    [12, 'Des'],
  ])('month %i is %s', (month, short) => {
    expect(formatDate(at(2026, month, 13))).toBe(`13 ${short} 2026`);
  });

  it('spells months out in the long form', () => {
    expect(formatDateLong(at(2026, 8, 13))).toBe('13 Agustus 2026');
    expect(formatDateLong(at(2026, 5, 1))).toBe('1 Mei 2026');
    expect(formatDateLong(at(2026, 10, 31))).toBe('31 Oktober 2026');
  });

  it('names the weekday in Indonesian', () => {
    // 13 Aug 2026 is a Thursday.
    expect(formatDateWithDay(at(2026, 8, 13))).toBe('Kamis, 13 Agustus 2026');
  });

  it('formats month and year for chart axes', () => {
    expect(formatMonthYear(at(2026, 8, 13))).toBe('Agu 2026');
  });
});

describe('input coercion', () => {
  it('accepts a Date, an ISO string, and epoch millis alike', () => {
    const date = at(2026, 8, 13, 14, 30);
    expect(formatDateTime(date)).toBe('13 Agu 2026, 14.30');
    expect(formatDateTime(date.toISOString())).toBe('13 Agu 2026, 14.30');
    expect(formatDateTime(date.getTime())).toBe('13 Agu 2026, 14.30');
  });

  it('throws on an invalid date rather than rendering "Invalid Date"', () => {
    expect(() => formatDateTime('not a date')).toThrow(TypeError);
    expect(() => formatDateTime(NaN)).toThrow(TypeError);
  });
});

describe('formatRelativeDateTime', () => {
  const now = at(2026, 8, 13, 18, 0);

  it('labels today and yesterday', () => {
    expect(formatRelativeDateTime(at(2026, 8, 13, 14, 30), now)).toBe('Hari ini, 14.30');
    expect(formatRelativeDateTime(at(2026, 8, 12, 9, 5), now)).toBe('Kemarin, 09.05');
  });

  it('falls back to the full format for older dates', () => {
    expect(formatRelativeDateTime(at(2026, 8, 11, 14, 30), now)).toBe('11 Agu 2026, 14.30');
  });

  it('handles yesterday across a month boundary', () => {
    const firstOfMonth = at(2026, 9, 1, 8, 0);
    expect(formatRelativeDateTime(at(2026, 8, 31, 22, 15), firstOfMonth)).toBe('Kemarin, 22.15');
  });
});

describe('isSameDay', () => {
  it('compares calendar days, not elapsed time', () => {
    expect(isSameDay(at(2026, 8, 13, 0, 1), at(2026, 8, 13, 23, 59))).toBe(true);
    expect(isSameDay(at(2026, 8, 13, 23, 59), at(2026, 8, 14, 0, 1))).toBe(false);
    expect(isSameDay(at(2025, 8, 13), at(2026, 8, 13))).toBe(false);
  });
});

describe('toApiDate', () => {
  it('emits ISO calendar dates for query params', () => {
    expect(toApiDate(at(2026, 8, 13))).toBe('2026-08-13');
    expect(toApiDate(at(2026, 12, 1))).toBe('2026-12-01');
  });
});
