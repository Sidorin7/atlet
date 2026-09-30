import type { ExerciseType } from '@/db/schema';
import { addDays, startOfWeek, type ISODate } from '@/lib/dates';

/** One filled set with the context needed for every progress view. */
export type ProgressRow = {
  id: number;
  date: ISODate;
  exerciseId: number;
  name: string;
  groupId: number;
  groupName: string;
  groupIcon: string;
  type: ExerciseType;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
};

export type Range = 'week' | 'month' | 'year' | 'all';

/** Tonnage: weight × reps, counted for weight exercises only (a belt load is not tonnage). */
export function volumeOf(r: ProgressRow): number {
  if (r.type !== 'weight' || r.weightKg === null || r.reps === null || r.weightKg <= 0) return 0;
  return r.weightKg * r.reps;
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

// ---------------------------------------------------------------------------------------------
// Overview insights: consistency, records, muscle balance, per-exercise trends.

/** Which cardio number to compare: distance when the exercise has any, otherwise time. */
export type CardioBy = 'distance' | 'time';

const cardioByOf = (rows: readonly ProgressRow[]): CardioBy =>
  rows.some((r) => r.type === 'cardio' && r.distanceM !== null && r.distanceM > 0) ? 'distance' : 'time';

/** Estimated one-rep max (Epley); a single is its own max. */
export const oneRepMax = (weightKg: number, reps: number): number => (reps === 1 ? weightKg : weightKg * (1 + reps / 30));

/**
 * How strong one set is, comparable across sets of the same exercise: estimated 1RM for weights,
 * reps for bodyweight, distance or time for cardio. Null when the set has nothing to compare.
 */
export function setScore(r: ProgressRow, cardioBy: CardioBy = 'distance'): number | null {
  if (r.type === 'weight') {
    return r.weightKg !== null && r.weightKg > 0 && r.reps !== null && r.reps > 0 ? oneRepMax(r.weightKg, r.reps) : null;
  }
  if (r.type === 'bodyweight') return r.reps !== null && r.reps > 0 ? r.reps : null;
  const v = cardioBy === 'distance' ? r.distanceM : r.durationSec;
  return v !== null && v > 0 ? v : null;
}

/** The best-scoring set of a list, or undefined if none can be scored. */
function bestOf(rows: readonly ProgressRow[], cardioBy: CardioBy): { row: ProgressRow; score: number } | undefined {
  let best: { row: ProgressRow; score: number } | undefined;
  for (const row of rows) {
    const score = setScore(row, cardioBy);
    if (score !== null && (!best || score > best.score)) best = { row, score };
  }
  return best;
}

const byExercise = (rows: readonly ProgressRow[]) => {
  const map = new Map<number, ProgressRow[]>();
  for (const r of rows) map.set(r.exerciseId, [...(map.get(r.exerciseId) ?? []), r]);
  return map;
};

const byDay = (rows: readonly ProgressRow[]) => {
  const map = new Map<ISODate, ProgressRow[]>();
  for (const r of rows) map.set(r.date, [...(map.get(r.date) ?? []), r]);
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
};

/** Days with at least one filled set. */
export const trainingDays = (rows: readonly ProgressRow[]): Set<ISODate> => new Set(rows.map((r) => r.date));

/**
 * Weeks in a row with at least one workout, counting back from this week. A week that has not
 * had a workout yet does not break the streak; the week before it decides.
 */
export function weekStreak(days: ReadonlySet<ISODate>, today: ISODate): number {
  const weeks = new Set([...days].filter((d) => d <= today).map(startOfWeek));
  let week = startOfWeek(today);
  if (!weeks.has(week)) week = addDays(week, -7);
  let streak = 0;
  for (; weeks.has(week); week = addDays(week, -7)) streak += 1;
  return streak;
}

/** Workout days within the last `n` days, today included. */
export const workoutsInLast = (days: ReadonlySet<ISODate>, today: ISODate, n: number): number =>
  [...days].filter((d) => d <= today && d > addDays(today, -n)).length;

export type HeatDay = { date: ISODate; trained: boolean; future: boolean };

/** The last `weeks` calendar weeks (Monday first), oldest first, as columns of 7 days. */
export function heatmapWeeks(days: ReadonlySet<ISODate>, today: ISODate, weeks: number): HeatDay[][] {
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(first, w * 7 + d);
      return { date, trained: days.has(date), future: date > today };
    }),
  );
}

export type PersonalRecord = { date: ISODate; row: ProgressRow; previous: ProgressRow };

/**
 * Days on which an exercise beat every earlier day, newest first. The first day of an exercise
 * sets the bar and is not a record.
 */
export function recentRecords(rows: readonly ProgressRow[], limit: number): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  for (const list of byExercise(rows).values()) {
    const cardioBy = cardioByOf(list);
    let bar: { row: ProgressRow; score: number } | undefined;
    for (const [date, dayRows] of byDay(list)) {
      const best = bestOf(dayRows, cardioBy);
      if (!best) continue;
      if (bar && best.score > bar.score) records.push({ date, row: best.row, previous: bar.row });
      if (!bar || best.score > bar.score) bar = best;
    }
  }
  return records
    .sort((a, b) => (a.date === b.date ? b.row.id - a.row.id : a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

export type Group = { id: number; name: string; icon: string };
export type GroupLoad = { group: Group; sets: number; lastDate: ISODate | null };

/** Sets per muscle group since `from`, and the last day each group was trained at all; every group listed. */
export function groupBalance(rows: readonly ProgressRow[], groups: readonly Group[], from: ISODate): GroupLoad[] {
  return groups.map((group) => {
    const own = rows.filter((r) => r.groupId === group.id);
    return {
      group,
      sets: own.filter((r) => r.date >= from).length,
      lastDate: own.reduce<ISODate | null>((last, r) => (last === null || r.date > last ? r.date : last), null),
    };
  });
}

/** Trend window: the last 4 weeks compared with the 4 weeks before. */
export const TREND_DAYS = 28;

export type ExerciseTrend = {
  exerciseId: number;
  name: string;
  groupIcon: string;
  /** The best set of the last 4 weeks, or of the last day trained if it was longer ago. */
  best: ProgressRow;
  /** Percent change against the 4 weeks before; 'new' with nothing to compare; null when not trained lately. */
  change: number | 'new' | null;
  lastDate: ISODate;
};

/** One line per exercise that has scored sets, most recently trained first. */
export function exerciseTrends(rows: readonly ProgressRow[], today: ISODate): ExerciseTrend[] {
  const currentFrom = addDays(today, -(TREND_DAYS - 1));
  const previousFrom = addDays(currentFrom, -TREND_DAYS);
  const trends: ExerciseTrend[] = [];
  for (const [exerciseId, list] of byExercise(rows)) {
    const cardioBy = cardioByOf(list);
    const days = byDay(list).filter(([, dayRows]) => bestOf(dayRows, cardioBy));
    if (days.length === 0) continue;
    const [lastDate, lastRows] = days[days.length - 1];
    const current = bestOf(
      list.filter((r) => r.date >= currentFrom && r.date <= today),
      cardioBy,
    );
    const previous = bestOf(
      list.filter((r) => r.date >= previousFrom && r.date < currentFrom),
      cardioBy,
    );
    trends.push({
      exerciseId,
      name: list[0].name,
      groupIcon: list[0].groupIcon,
      best: (current ?? bestOf(lastRows, cardioBy)!).row,
      change: !current ? null : !previous ? 'new' : Math.round(((current.score - previous.score) / previous.score) * 100),
      lastDate,
    });
  }
  return trends.sort((a, b) => (a.lastDate === b.lastDate ? a.name.localeCompare(b.name) : a.lastDate < b.lastDate ? 1 : -1));
}
