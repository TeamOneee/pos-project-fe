/** Turning the Owner's period controls into the date range the API wants. */

export const PERIOD_PRESETS = ['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS'] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PRESET_LABELS: Record<PeriodPreset, string> = {
  TODAY: 'Hari Ini',
  LAST_7_DAYS: '7 Hari Terakhir',
  LAST_30_DAYS: '30 Hari Terakhir',
};

/** How many days each preset spans, counting today. */
const PRESET_DAYS: Record<PeriodPreset, number> = {
  TODAY: 1,
  LAST_7_DAYS: 7,
  LAST_30_DAYS: 30,
};

/** What the dashboard is currently showing. */
export type PeriodSelection =
  { kind: 'PRESET'; preset: PeriodPreset } | { kind: 'CUSTOM'; from: string; to: string };

export const DEFAULT_SELECTION: PeriodSelection = { kind: 'PRESET', preset: 'LAST_30_DAYS' };

/** §6.2: the hard ceiling on an inclusive range. */
export const MAX_RANGE_DAYS = 366;

/** The manual picker is deliberately narrow — the presets cover anything longer. */
export const MAX_CUSTOM_RANGE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRange = {
  /** ISO-8601 with offset, at the first instant of the period. */
  date_from: string;
  /** ISO-8601 with offset, at the last instant of the period. */
  date_to: string;
};

/** The range a selection means. Presets end at the end of today. */
export function rangeFor(selection: PeriodSelection, now: Date = new Date()): DateRange {
  if (selection.kind === 'CUSTOM') {
    const from = parseLocalDay(selection.from);
    const to = parseLocalDay(selection.to);

    // An unparseable pair can only arrive from a caller that skipped validateCustomRange; fall back
    // rather than emit "Invalid Date" params.
    if (!from || !to) return rangeFor(DEFAULT_SELECTION, now);

    const end = endOfDay(to);
    return { date_from: toIso(clampStart(startOfDay(from), end)), date_to: toIso(end) };
  }

  return rollingRange(PRESET_DAYS[selection.preset], now);
}

/** A stable string for one selection, for dependency arrays. */
export function periodKey(selection: PeriodSelection): string {
  return selection.kind === 'PRESET'
    ? `PRESET:${selection.preset}`
    : `CUSTOM:${selection.from}:${selection.to}`;
}

/** The period immediately before this one, of the same length. */
export function previousRange(range: DateRange): DateRange {
  const start = new Date(range.date_from);
  const end = new Date(range.date_to);
  const span = end.getTime() - start.getTime();

  const previousEnd = new Date(start.getTime() - 1000);
  const previousStart = new Date(previousEnd.getTime() - span);

  return { date_from: toIso(previousStart), date_to: toIso(previousEnd) };
}

/** Percentage change, or null when there is no baseline to compare against. */
export function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Which bucket width suits a range — hourly only makes sense within a day. */
export function bucketFor(range: DateRange): 'HOUR' | 'DAY' {
  return spanDays(range) <= 1 ? 'HOUR' : 'DAY';
}

/** Inclusive day count between two `YYYY-MM-DD` days; NaN if either is unparseable. */
export function daysBetween(from: string, to: string): number {
  const start = parseLocalDay(from);
  const end = parseLocalDay(to);
  if (!start || !end) return Number.NaN;

  // Rounded, not truncated: a DST transition inside the range makes the raw quotient 6.958 rather
  // than 7, and a week would read as over the cap.
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

export type CustomRangeError = 'INCOMPLETE' | 'REVERSED' | 'TOO_WIDE';

/** Null when the pair is a legal custom range. */
export function validateCustomRange(from: string, to: string): CustomRangeError | null {
  const days = daysBetween(from, to);
  if (Number.isNaN(days)) return 'INCOMPLETE';
  if (days < 1) return 'REVERSED';
  if (days > MAX_CUSTOM_RANGE_DAYS) return 'TOO_WIDE';
  return null;
}

/** `YYYY-MM-DD` → local midnight, or null if that is not a real day. */
export function parseLocalDay(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;

  const [, year, month, date] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(date));

  // Rejects the likes of 2026-02-31, which Date would roll into March.
  if (parsed.getMonth() !== Number(month) - 1 || parsed.getDate() !== Number(date)) return null;
  return parsed;
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                   */
/* -------------------------------------------------------------------------- */

/** A rolling window of `days` calendar days ending at the end of today. */
function rollingRange(days: number, now: Date): DateRange {
  const end = endOfDay(now);

  // Stepped on the date component rather than by subtracting milliseconds: a DST transition inside
  // the window makes `now - n * DAY_MS` land an hour short and resolve to the wrong local day.
  const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)));

  return { date_from: toIso(clampStart(start, end)), date_to: toIso(end) };
}

/** Inclusive day count a range covers, from its two ISO instants. */
function spanDays(range: DateRange): number {
  const from = new Date(range.date_from);
  const to = new Date(range.date_to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return Number.NaN;

  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS) + 1;
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
 * ISO-8601 **with the local offset**, as §0 requires — not `toISOString`, which would silently
 * shift everything to UTC and move a period boundary by hours.
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
