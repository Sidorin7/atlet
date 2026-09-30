import type { ExerciseType } from '@/db/schema';
import { addDays, startOfMonth, startOfWeek, type ISODate } from '@/lib/dates';

/** One filled set with the context needed for every progress view. */
export type ProgressRow = {
  id: number;
  date: ISODate;
  exerciseId: number;
  name: string;
  groupIcon: string;
  type: ExerciseType;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
};

export type Granularity = 'week' | 'month';
export type Range = 'week' | 'month' | 'year' | 'all';

/** Tonnage: weight × reps, counted for weight exercises only (a belt load is not tonnage). */
export function volumeOf(r: ProgressRow): number {
  if (r.type !== 'weight' || r.weightKg === null || r.reps === null || r.weightKg <= 0) return 0;
  return r.weightKg * r.reps;
}

const bucketStart = (date: ISODate, g: Granularity) => (g === 'week' ? startOfWeek(date) : startOfMonth(date));

const previousPeriod = (start: ISODate, g: Granularity): ISODate =>
  g === 'week' ? addDays(start, -7) : startOfMonth(addDays(start, -1));

export type Bucket = { start: ISODate; volume: number; workouts: number };

/** The last `count` periods ending with the one containing `today`, oldest first, empty ones as zeros. */
export function periodBuckets(rows: readonly ProgressRow[], g: Granularity, today: ISODate, count: number): Bucket[] {
  const starts: ISODate[] = [];
  for (let s = bucketStart(today, g); starts.length < count; s = previousPeriod(s, g)) starts.unshift(s);

  const volume = new Map(starts.map((s) => [s, 0]));
  const days = new Map(starts.map((s) => [s, new Set<ISODate>()]));
  for (const r of rows) {
    const key = bucketStart(r.date, g);
    if (!volume.has(key)) continue;
    volume.set(key, volume.get(key)! + volumeOf(r));
    days.get(key)!.add(r.date);
  }
  return starts.map((start) => ({ start, volume: volume.get(start)!, workouts: days.get(start)!.size }));
}

const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = { week: 7, month: 30, year: 365 };

export const rangeStart = (today: ISODate, range: Range): ISODate | null =>
  range === 'all' ? null : addDays(today, -RANGE_DAYS[range]);

export type SeriesPoint = { date: ISODate; primary: number; secondary: number };

/**
 * Per-day points for one exercise, oldest first.
 * weight: max kg / tonnage · bodyweight: best set reps / total reps · cardio: minutes / km.
 */
export function exerciseSeries(
  rows: readonly ProgressRow[],
  exerciseId: number,
  type: ExerciseType,
  from: ISODate | null,
): SeriesPoint[] {
  const byDay = new Map<ISODate, ProgressRow[]>();
  for (const r of rows) {
    if (r.exerciseId !== exerciseId || (from !== null && r.date < from)) continue;
    byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
  }
  const sum = (list: ProgressRow[], f: (r: ProgressRow) => number) => list.reduce((a, r) => a + f(r), 0);
  const max = (list: ProgressRow[], f: (r: ProgressRow) => number) => Math.max(0, ...list.map(f));

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, list]) => {
      if (type === 'cardio') {
        return {
          date,
          primary: sum(list, (r) => (r.durationSec ?? 0) / 60),
          secondary: sum(list, (r) => (r.distanceM ?? 0) / 1000),
        };
      }
      if (type === 'bodyweight') {
        return { date, primary: max(list, (r) => r.reps ?? 0), secondary: sum(list, (r) => r.reps ?? 0) };
      }
      return { date, primary: max(list, (r) => r.weightKg ?? 0), secondary: sum(list, volumeOf) };
    });
}

export type HistoryDay = { date: ISODate; sets: ProgressRow[] };

/** Sets of one exercise grouped by day, newest day first, from `from` on; sets keep their entry order. */
export function exerciseHistory(
  rows: readonly ProgressRow[],
  exerciseId: number,
  from: ISODate | null = null,
): HistoryDay[] {
  const byDay = new Map<ISODate, ProgressRow[]>();
  for (const r of rows) {
    if (r.exerciseId !== exerciseId || (from !== null && r.date < from)) continue;
    byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? 1 : -1)).map(([date, sets]) => ({ date, sets }));
}
