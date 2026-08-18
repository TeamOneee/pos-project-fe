/**
 * Turning the Owner's period chips into the date range the API wants.
 *
 * Contract §6.2 takes explicit `date_from` / `date_to` ISO-8601 datetimes on
 * every business endpoint — there is no `period=THIS_MONTH` parameter anywhere.
 * The chips are still the right control for the screen, so the mapping lives
 * here, in one place, rather than in each card.
 *
 * Two rules from §6.2 are enforced here rather than discovered as a 400:
 * the range is inclusive, and it may not exceed 366 days.
 *
 * On timezones: §6.1 rule 4 buckets by `merchant.timezone`, and the boundaries
 * below are computed in the browser's. For a single-timezone Indonesian
 * merchant those agree; for a merchant whose staff travel they can differ by a
 * few hours at the edges of a period. Sending an explicit offset the server
 * then reinterprets is the contract's own design, so this is as close as a
 * client can get without a timezone-aware date library.
 */

export const PERIODS = ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR'] as const;

export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  TODAY: 'Hari Ini',
  THIS_WEEK: 'Minggu Ini',
  THIS_MONTH: 'Bulan Ini',
  THIS_QUARTER: 'Kuartal Ini',
  THIS_YEAR: 'Tahun Ini',
};

/** §6.2: the hard ceiling on an inclusive range. */
export const MAX_RANGE_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRange = {
  /** ISO-8601 with offset, at the first instant of the period. */
  date_from: string;
  /** ISO-8601 with offset, at the last instant of the period. */
  date_to: string;
};

/** The range a chip means, ending at the end of today. */
export function rangeFor(period: Period, now: Date = new Date()): DateRange {
  const end = endOfDay(now);
  const start = startOfDay(startFor(period, now));

  return { date_from: toIso(clampStart(start, end)), date_to: toIso(end) };
}

/**
 * The period immediately before this one, of the same length.
 *
 * §6.2 has no comparison endpoint and `/dashboard/summary` reports one period
 * at a time, so period-over-period deltas are two reads and a subtraction on
 * the client. This produces the second range: same duration, ending the instant
 * before the current one starts.
 */
export function previousRange(range: DateRange): DateRange {
  const start = new Date(range.date_from);
  const end = new Date(range.date_to);
  const span = end.getTime() - start.getTime();

  const previousEnd = new Date(start.getTime() - 1000);
  const previousStart = new Date(previousEnd.getTime() - span);

  return { date_from: toIso(previousStart), date_to: toIso(previousEnd) };
}

/**
 * Percentage change, or null when there is no baseline to compare against.
 *
 * Null rather than 100: a first month of trading has not grown by 100%, it has
 * nothing to be compared with, and the chip says "Baru" instead of a number.
 */
export function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Which bucket width suits a range — hourly only makes sense within a day. */
export function bucketFor(period: Period): 'HOUR' | 'DAY' {
  return period === 'TODAY' ? 'HOUR' : 'DAY';
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                   */
/* -------------------------------------------------------------------------- */

function startFor(period: Period, now: Date): Date {
  const date = new Date(now);

  switch (period) {
    case 'TODAY':
      return date;

    case 'THIS_WEEK': {
      // Monday-first, which is how an Indonesian trading week reads.
      const weekday = (date.getDay() + 6) % 7;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekday);
    }

    case 'THIS_MONTH':
      return new Date(date.getFullYear(), date.getMonth(), 1);

    case 'THIS_QUARTER':
      return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);

    case 'THIS_YEAR':
      return new Date(date.getFullYear(), 0, 1);
  }
}

/** Keeps the span inside the contract's 366-day ceiling. */
function clampStart(start: Date, end: Date): Date {
  const earliest = new Date(end.getTime() - (MAX_RANGE_DAYS - 1) * DAY_MS);
  return start.getTime() < earliest.getTime() ? earliest : start;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/**
 * ISO-8601 **with the local offset**, as §0 requires — not `toISOString`, which
 * would silently shift everything to UTC and move a period boundary by hours.
 */
function toIso(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const pad = (value: number) => String(Math.floor(Math.abs(value))).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(offset / 60)}:${pad(offset % 60)}`
  );
}
