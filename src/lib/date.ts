/**
 * Date formatting. CLAUDE.md rule 5: dates render as "13 Agu 2026, 14.30" — Indonesian short month,
 * 24-hour clock, dot as the time separator.
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

/** "15–21 Agu" / "28 Agu – 3 Sep" / "15 Agu" — a compact inclusive day range. */
export function formatDayRangeShort(from: DateInput, to: DateInput): string {
  const start = toDate(from);
  const end = toDate(to);

  if (isSameDay(start, end)) return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]}`;

  // Within one month the month name is said once: "15–21 Agu", not "15 Agu – 21 Agu".
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_SHORT[start.getMonth()]}`;
  }

  return (
    `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} – ` +
    `${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`
  );
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

/** "Hari ini, 14.30" / "Kemarin, 14.30" / "13 Agu 2026, 14.30". */
export function formatRelativeDateTime(input: DateInput, now: DateInput = new Date()): string {
  const date = toDate(input);
  const today = toDate(now);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) return `Hari ini, ${formatTime(date)}`;
  if (isSameDay(date, yesterday)) return `Kemarin, ${formatTime(date)}`;
  return formatDateTime(date);
}

/** "Baru saja" / "2 menit lalu" / "3 jam lalu", falling back to the full timestamp past a day. */
export function formatTimeAgo(input: DateInput, now: DateInput = new Date()): string {
  const then = toDate(input).getTime();
  const current = toDate(now).getTime();
  const seconds = Math.floor((current - then) / 1000);

  // A clock skew or a future timestamp reads as fresh rather than negative.
  if (seconds < 45) return 'Baru saja';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  return formatDateTime(then);
}

/** "2026-08-13" — for API query params, never for display. */
export function toApiDate(input: DateInput): string {
  const d = toDate(input);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
