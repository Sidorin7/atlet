/** Calendar dates as 'YYYY-MM-DD' strings. All arithmetic is done in UTC so DST never shifts a day. */
export type ISODate = string;

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

const toUTC = (iso: ISODate) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms: number): ISODate => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** Today in the device's local calendar. */
export const todayISO = (now: Date = new Date()): ISODate =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

export const addDays = (iso: ISODate, n: number): ISODate => fromUTC(toUTC(iso) + n * DAY_MS);

/** Whole days from `earlier` to `later` (negative if `later` is before `earlier`). */
export const diffDays = (later: ISODate, earlier: ISODate): number =>
  Math.round((toUTC(later) - toUTC(earlier)) / DAY_MS);

/** 0 = Monday … 6 = Sunday. */
export const weekdayIndex = (iso: ISODate): number => (new Date(toUTC(iso)).getUTCDay() + 6) % 7;

export const startOfWeek = (iso: ISODate): ISODate => addDays(iso, -weekdayIndex(iso));

export const weekDates = (iso: ISODate): ISODate[] => {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const startOfMonth = (iso: ISODate): ISODate => `${iso.slice(0, 7)}-01`;

export const addMonths = (iso: ISODate, n: number): ISODate => {
  const [y, m] = iso.split('-').map(Number);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`;
};

/** Six Monday-first weeks (fixed height) that cover the month of `iso`. */
export const monthGrid = (iso: ISODate): ISODate[][] => {
  const start = startOfWeek(startOfMonth(iso));
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)),
  );
};

export const isSameMonth = (a: ISODate, b: ISODate) => a.slice(0, 7) === b.slice(0, 7);

const fmt = (iso: ISODate, locale: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(new Date(toUTC(iso)));

/** Short weekday labels Monday first, e.g. ['Пн', …]. */
export const weekdayLabels = (locale: string): string[] =>
  weekDates('2026-09-28').map((d) => {
    const s = fmt(d, locale, { weekday: 'short' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

export const monthTitle = (iso: ISODate, locale: string, withYear: boolean): string => {
  const s = fmt(iso, locale, withYear ? { month: 'long', year: 'numeric' } : { month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const dayNumber = (iso: ISODate): number => Number(iso.slice(8, 10));

export const shortMonth = (iso: ISODate, locale: string): string => fmt(iso, locale, { month: 'short' });

export const dayMonthLabel = (iso: ISODate, locale: string): string =>
  fmt(iso, locale, { day: 'numeric', month: 'long' });
