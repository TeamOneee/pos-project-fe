/**
 * Dates, against the one format CLAUDE.md rule 5 specifies: "13 Agu 2026, 14.30" — Indonesian short
 * month, 24-hour clock, dot separator.
 */

import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateLong,
  formatDateTime,
  formatDateWithDay,
  formatMonthYear,
  formatRelativeDateTime,
  formatTime,
  formatTimeAgo,
  isSameDay,
  toApiDate,
} from '@/lib/date';

const AUG_13 = new Date(2026, 7, 13, 14, 30);

describe('the canonical format', () => {
  it('renders the example from the rules exactly', () => {
    expect(formatDateTime(AUG_13)).toBe('13 Agu 2026, 14.30');
  });

  it('renders date and time separately', () => {
    expect(formatDate(AUG_13)).toBe('13 Agu 2026');
    expect(formatTime(AUG_13)).toBe('14.30');
  });

  it('uses a 24-hour clock with a dot, and pads both parts', () => {
    expect(formatTime(new Date(2026, 0, 1, 9, 5))).toBe('09.05');
    expect(formatTime(new Date(2026, 0, 1, 0, 0))).toBe('00.00');
    expect(formatTime(new Date(2026, 0, 1, 23, 59))).toBe('23.59');
    // Never a colon, never AM/PM.
    expect(formatTime(new Date(2026, 0, 1, 13, 0))).toBe('13.00');
  });

  it('names every month in Indonesian', () => {
    const names = Array.from(
      { length: 12 },
      (_, month) => formatDate(new Date(2026, month, 1)).split(' ')[1]
    );

    expect(names).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ]);
  });

  it('does not zero-pad the day of the month', () => {
    expect(formatDate(new Date(2026, 7, 1))).toBe('1 Agu 2026');
  });
});

describe('long forms', () => {
  it('spells the month out', () => {
    expect(formatDateLong(AUG_13)).toBe('13 Agustus 2026');
    expect(formatDateLong(new Date(2026, 4, 2))).toBe('2 Mei 2026');
  });

  it('prefixes the weekday in Indonesian', () => {
    // 13 August 2026 is a Thursday.
    expect(formatDateWithDay(AUG_13)).toBe('Kamis, 13 Agustus 2026');
  });

  it('renders month and year for axes', () => {
    expect(formatMonthYear(AUG_13)).toBe('Agu 2026');
  });
});

describe('relative forms', () => {
  it('says today and yesterday before falling back to the date', () => {
    const now = new Date(2026, 7, 13, 18, 0);

    expect(formatRelativeDateTime(new Date(2026, 7, 13, 9, 15), now)).toBe('Hari ini, 09.15');
    expect(formatRelativeDateTime(new Date(2026, 7, 12, 21, 5), now)).toBe('Kemarin, 21.05');
    expect(formatRelativeDateTime(new Date(2026, 7, 11, 21, 5), now)).toBe('11 Agu 2026, 21.05');
  });

  it('counts minutes and hours, then gives up and shows the timestamp', () => {
    const now = new Date(2026, 7, 13, 14, 30);

    expect(formatTimeAgo(new Date(2026, 7, 13, 14, 30), now)).toBe('Baru saja');
    expect(formatTimeAgo(new Date(2026, 7, 13, 14, 29, 20), now)).toBe('Baru saja');
    expect(formatTimeAgo(new Date(2026, 7, 13, 14, 28), now)).toBe('2 menit lalu');
    expect(formatTimeAgo(new Date(2026, 7, 13, 11, 30), now)).toBe('3 jam lalu');
    expect(formatTimeAgo(new Date(2026, 7, 11, 11, 30), now)).toBe('11 Agu 2026, 11.30');
  });

  it('treats a future timestamp as fresh rather than negative', () => {
    const now = new Date(2026, 7, 13, 14, 30);
    expect(formatTimeAgo(new Date(2026, 7, 13, 15, 0), now)).toBe('Baru saja');
  });

  it('compares calendar days, not elapsed time', () => {
    expect(isSameDay(new Date(2026, 7, 13, 0, 1), new Date(2026, 7, 13, 23, 59))).toBe(true);
    expect(isSameDay(new Date(2026, 7, 13, 23, 59), new Date(2026, 7, 14, 0, 1))).toBe(false);
  });
});

describe('API dates', () => {
  it('emits YYYY-MM-DD, zero-padded, in local time', () => {
    expect(toApiDate(new Date(2026, 7, 13))).toBe('2026-08-13');
    expect(toApiDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toApiDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('invalid input', () => {
  it('throws rather than rendering "Invalid Date"', () => {
    for (const input of ['', 'not-a-date', Number.NaN]) {
      expect(() => formatDate(input)).toThrow(TypeError);
    }
  });
});
