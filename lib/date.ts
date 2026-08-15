/**
 * Date formatting. CLAUDE.md rule 5: dates render as "13 Agu 2026, 14.30" —
 * Indonesian short month, 24-hour clock, dot as the time separator.
 *
 * Formatted by hand rather than via Intl: RN's Hermes engine ships a trimmed
 * ICU on Android, so `id-ID` locale data is not reliably present, and the
 * dot-separated time is not what `id-ID` produces anyway.
 */

/** Indonesian short month names, index 0 = January. */
const MONTHS_SHORT = [
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
] as const;

const MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

export type DateInput = Date | string | number;

/** Coerce API input (ISO string, epoch ms, Date) to a Date. */
function toDate(input: DateInput): Date {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid date: ${JSON.stringify(input)}`);
  }
  return date;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** "13 Agu 2026" */
export function formatDate(input: DateInput): string {
  const d = toDate(input);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "14.30" — 24-hour, dot separator. */
export function formatTime(input: DateInput): string {
  const d = toDate(input);
  return `${pad2(d.getHours())}.${pad2(d.getMinutes())}`;
}

/** "13 Agu 2026, 14.30" — the canonical timestamp format. */
export function formatDateTime(input: DateInput): string {
  return `${formatDate(input)}, ${formatTime(input)}`;
}

/** "13 Agustus 2026" — for headers and detail screens. */
export function formatDateLong(input: DateInput): string {
  const d = toDate(input);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Kamis, 13 Agustus 2026" */
export function formatDateWithDay(input: DateInput): string {
  const d = toDate(input);
  return `${DAYS_LONG[d.getDay()]}, ${formatDateLong(d)}`;
}

/** "Agu 2026" — for chart axes and monthly grouping. */
export function formatMonthYear(input: DateInput): string {
  const d = toDate(input);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** True when the two inputs fall on the same local calendar day. */
export function isSameDay(a: DateInput, b: DateInput): boolean {
  const dateA = toDate(a);
  const dateB = toDate(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

/**
 * "Hari ini, 14.30" / "Kemarin, 14.30" / "13 Agu 2026, 14.30".
 * For transaction lists where recency is the thing being scanned for.
 */
export function formatRelativeDateTime(input: DateInput, now: DateInput = new Date()): string {
  const date = toDate(input);
  const today = toDate(now);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) return `Hari ini, ${formatTime(date)}`;
  if (isSameDay(date, yesterday)) return `Kemarin, ${formatTime(date)}`;
  return formatDateTime(date);
}

/** "2026-08-13" — for API query params, never for display. */
export function toApiDate(input: DateInput): string {
  const d = toDate(input);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
