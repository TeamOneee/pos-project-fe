import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SELECTION,
  MAX_CUSTOM_RANGE_DAYS,
  bucketFor,
  daysBetween,
  periodKey,
  previousRange,
  rangeFor,
  validateCustomRange,
  type PeriodSelection,
} from './period';

/** A Thursday, mid-month, mid-year — nothing near a boundary by accident. */
const NOW = new Date(2026, 7, 13, 14, 30, 0); // 13 Agu 2026, 14.30 local

const preset = (p: 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS'): PeriodSelection => ({
  kind: 'PRESET',
  preset: p,
});

const custom = (from: string, to: string): PeriodSelection => ({ kind: 'CUSTOM', from, to });

/** The local-offset suffix the contract wants, e.g. "+07:00" — never "Z". */
const OFFSET = /[+-]\d{2}:\d{2}$/;

describe('rangeFor', () => {
  it('makes TODAY a single day, first instant to last', () => {
    const range = rangeFor(preset('TODAY'), NOW);

    expect(range.date_from).toMatch(/^2026-08-13T00:00:00/);
    expect(range.date_to).toMatch(/^2026-08-13T23:59:59/);
  });

  it('emits a local offset rather than UTC', () => {
    const range = rangeFor(preset('TODAY'), NOW);

    expect(range.date_from).toMatch(OFFSET);
    expect(range.date_to).toMatch(OFFSET);
    expect(range.date_from.endsWith('Z')).toBe(false);
  });

  it('rolls LAST_7_DAYS back six days, not to the start of the week', () => {
    const range = rangeFor(preset('LAST_7_DAYS'), NOW);

    // 13 Agu 2026 is a Thursday; a calendar week would start Monday the 10th.
    expect(range.date_from).toMatch(/^2026-08-07T00:00:00/);
    expect(range.date_to).toMatch(/^2026-08-13T23:59:59/);
  });

  it('rolls LAST_30_DAYS back across the month boundary', () => {
    const range = rangeFor(preset('LAST_30_DAYS'), NOW);

    // 29 days before 13 Agu, not the 1st of the month.
    expect(range.date_from).toMatch(/^2026-07-15T00:00:00/);
    expect(range.date_to).toMatch(/^2026-08-13T23:59:59/);
  });

  it('takes a custom range as the exact local days picked, inclusive', () => {
    const range = rangeFor(custom('2026-08-15', '2026-08-21'), NOW);

    expect(range.date_from).toMatch(/^2026-08-15T00:00:00/);
    expect(range.date_to).toMatch(/^2026-08-21T23:59:59/);
  });

  it('keeps a same-day custom range on that one day', () => {
    const range = rangeFor(custom('2026-08-15', '2026-08-15'), NOW);

    expect(range.date_from).toMatch(/^2026-08-15T00:00:00/);
    expect(range.date_to).toMatch(/^2026-08-15T23:59:59/);
  });

  it('falls back to the default rather than emitting an invalid date', () => {
    expect(rangeFor(custom('', ''), NOW)).toEqual(rangeFor(DEFAULT_SELECTION, NOW));
  });
});

describe('bucketFor', () => {
  it('buckets a single day hourly', () => {
    expect(bucketFor(rangeFor(preset('TODAY'), NOW))).toBe('HOUR');
    expect(bucketFor(rangeFor(custom('2026-08-15', '2026-08-15'), NOW))).toBe('HOUR');
  });

  it('buckets anything longer daily', () => {
    expect(bucketFor(rangeFor(preset('LAST_7_DAYS'), NOW))).toBe('DAY');
    expect(bucketFor(rangeFor(preset('LAST_30_DAYS'), NOW))).toBe('DAY');
    expect(bucketFor(rangeFor(custom('2026-08-15', '2026-08-16'), NOW))).toBe('DAY');
  });
});

describe('daysBetween', () => {
  it('counts inclusively', () => {
    expect(daysBetween('2026-08-15', '2026-08-15')).toBe(1);
    expect(daysBetween('2026-08-15', '2026-08-21')).toBe(7);
  });

  it('is NaN when either day is unparseable', () => {
    expect(daysBetween('', '2026-08-21')).toBeNaN();
    expect(daysBetween('2026-02-31', '2026-08-21')).toBeNaN();
  });
});

describe('validateCustomRange', () => {
  it('accepts one day through the cap', () => {
    expect(validateCustomRange('2026-08-15', '2026-08-15')).toBeNull();
    expect(validateCustomRange('2026-08-15', '2026-08-21')).toBeNull();
    expect(daysBetween('2026-08-15', '2026-08-21')).toBe(MAX_CUSTOM_RANGE_DAYS);
  });

  it('rejects one day past the cap', () => {
    expect(validateCustomRange('2026-08-15', '2026-08-22')).toBe('TOO_WIDE');
  });

  it('rejects a reversed pair', () => {
    expect(validateCustomRange('2026-08-21', '2026-08-15')).toBe('REVERSED');
  });

  it('reports an unfilled pair as incomplete rather than invalid', () => {
    expect(validateCustomRange('', '')).toBe('INCOMPLETE');
    expect(validateCustomRange('2026-08-15', '')).toBe('INCOMPLETE');
  });
});

describe('previousRange', () => {
  it('is the preceding window of equal length, ending a second before', () => {
    const current = rangeFor(preset('LAST_7_DAYS'), NOW);
    const before = previousRange(current);

    expect(before.date_from).toMatch(/^2026-07-31T00:00:00/);
    expect(before.date_to).toMatch(/^2026-08-06T23:59:59/);
  });
});

describe('periodKey', () => {
  it('is stable for equal selections and distinct for different ones', () => {
    expect(periodKey(preset('TODAY'))).toBe(periodKey(preset('TODAY')));
    expect(periodKey(custom('2026-08-15', '2026-08-21'))).toBe(
      periodKey(custom('2026-08-15', '2026-08-21'))
    );
    expect(periodKey(preset('TODAY'))).not.toBe(periodKey(preset('LAST_7_DAYS')));
    expect(periodKey(custom('2026-08-15', '2026-08-21'))).not.toBe(
      periodKey(custom('2026-08-15', '2026-08-20'))
    );
  });
});
