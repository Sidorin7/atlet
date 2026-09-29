import {
  exerciseHistory,
  exerciseSeries,
  exerciseSummaries,
  periodBuckets,
  rangeStart,
  volumeOf,
  type ProgressRow,
} from '../aggregate';

let seq = 0;
const row = (over: Partial<ProgressRow>): ProgressRow => ({
  id: ++seq,
  date: '2026-09-29',
  exerciseId: 1,
  name: 'Жим',
  groupIcon: 'chest',
  type: 'weight',
  weightKg: 60,
  reps: 8,
  durationSec: null,
  distanceM: null,
  ...over,
});

describe('volumeOf', () => {
  it('is weight × reps for weight exercises', () => {
    expect(volumeOf(row({ weightKg: 60, reps: 8 }))).toBe(480);
    expect(volumeOf(row({ weightKg: 72.5, reps: 4 }))).toBe(290);
  });
  it('is 0 when weight or reps is missing, or the load is not positive', () => {
    expect(volumeOf(row({ weightKg: null, reps: 8 }))).toBe(0);
    expect(volumeOf(row({ weightKg: 60, reps: null }))).toBe(0);
    expect(volumeOf(row({ weightKg: 0, reps: 8 }))).toBe(0);
  });
  it('does not count bodyweight or cardio as tonnage', () => {
    expect(volumeOf(row({ type: 'bodyweight', weightKg: 10, reps: 8 }))).toBe(0);
    expect(volumeOf(row({ type: 'cardio', weightKg: null, reps: null, durationSec: 600 }))).toBe(0);
  });
});

describe('periodBuckets', () => {
  const today = '2026-09-30';
  it('returns the last N weeks ending with this one, oldest first, zeros included', () => {
    const buckets = periodBuckets([row({ date: '2026-09-15' })], 'week', today, 3);
    expect(buckets.map((b) => b.start)).toEqual(['2026-09-14', '2026-09-21', '2026-09-28']);
    expect(buckets.map((b) => b.volume)).toEqual([480, 0, 0]);
  });

  it('sums a week and counts distinct workout days, not sets', () => {
    const rows = [
      row({ date: '2026-09-28' }),
      row({ date: '2026-09-28', weightKg: 70, reps: 5 }),
      row({ date: '2026-09-30', weightKg: 20, reps: 10 }),
    ];
    const [thisWeek] = periodBuckets(rows, 'week', today, 1);
    expect(thisWeek).toEqual({ start: '2026-09-28', volume: 480 + 350 + 200, workouts: 2 });
  });

  it('counts a bodyweight-only day as a workout with no tonnage', () => {
    const [b] = periodBuckets([row({ type: 'bodyweight', reps: 12, weightKg: null })], 'week', today, 1);
    expect(b.workouts).toBe(1);
    expect(b.volume).toBe(0);
  });

  it('buckets by calendar month', () => {
    const rows = [row({ date: '2026-08-31' }), row({ date: '2026-09-01' }), row({ date: '2026-09-30' })];
    const buckets = periodBuckets(rows, 'month', today, 2);
    expect(buckets.map((b) => [b.start, b.workouts])).toEqual([
      ['2026-08-01', 1],
      ['2026-09-01', 2],
    ]);
  });

  it('ignores rows outside the window', () => {
    const buckets = periodBuckets([row({ date: '2026-01-05' }), row({ date: '2026-10-20' })], 'week', today, 4);
    expect(buckets.every((b) => b.volume === 0 && b.workouts === 0)).toBe(true);
  });
});

describe('rangeStart', () => {
  it('goes back a fixed number of days, or is unbounded for all', () => {
    expect(rangeStart('2026-09-30', 'month')).toBe('2026-08-31');
    expect(rangeStart('2026-09-30', 'quarter')).toBe('2026-07-01');
    expect(rangeStart('2026-09-30', 'year')).toBe('2025-09-30');
    expect(rangeStart('2026-09-30', 'all')).toBeNull();
  });
});

describe('exerciseSeries', () => {
  it('weight: per day max weight and tonnage, oldest first', () => {
    const rows = [
      row({ date: '2026-09-20', weightKg: 60, reps: 8 }),
      row({ date: '2026-09-20', weightKg: 65, reps: 5 }),
      row({ date: '2026-09-25', weightKg: 62.5, reps: 8 }),
      row({ exerciseId: 2, date: '2026-09-25', weightKg: 999, reps: 1 }),
    ];
    expect(exerciseSeries(rows, 1, 'weight', null)).toEqual([
      { date: '2026-09-20', primary: 65, secondary: 480 + 325 },
      { date: '2026-09-25', primary: 62.5, secondary: 500 },
    ]);
  });

  it('bodyweight: best reps in a set and total reps', () => {
    const rows = [
      row({ type: 'bodyweight', weightKg: null, reps: 10 }),
      row({ type: 'bodyweight', weightKg: null, reps: 8 }),
    ];
    expect(exerciseSeries(rows, 1, 'bodyweight', null)).toEqual([
      { date: '2026-09-29', primary: 10, secondary: 18 },
    ]);
  });

  it('cardio: total minutes and total kilometres', () => {
    const rows = [
      row({ type: 'cardio', weightKg: null, reps: null, durationSec: 600, distanceM: 2000 }),
      row({ type: 'cardio', weightKg: null, reps: null, durationSec: 300, distanceM: 1500 }),
    ];
    expect(exerciseSeries(rows, 1, 'cardio', null)).toEqual([
      { date: '2026-09-29', primary: 15, secondary: 3.5 },
    ]);
  });

  it('respects the start date of the range', () => {
    const rows = [row({ date: '2026-08-01' }), row({ date: '2026-09-20' })];
    expect(exerciseSeries(rows, 1, 'weight', '2026-09-01').map((p) => p.date)).toEqual(['2026-09-20']);
  });
});

describe('exerciseHistory', () => {
  it('groups sets by day, newest day first, keeping set order', () => {
    const rows = [
      row({ id: 1, date: '2026-09-20', weightKg: 60, reps: 8 }),
      row({ id: 2, date: '2026-09-20', weightKg: 62.5, reps: 6 }),
      row({ id: 3, date: '2026-09-25', weightKg: 65, reps: 5 }),
      row({ id: 4, exerciseId: 2, date: '2026-09-25' }),
    ];
    const history = exerciseHistory(rows, 1);
    expect(history.map((d) => d.date)).toEqual(['2026-09-25', '2026-09-20']);
    expect(history[1].sets.map((s) => s.id)).toEqual([1, 2]);
  });
});

describe('exerciseSummaries', () => {
  it('lists each exercise once with its last day and number of sessions, newest first', () => {
    const rows = [
      row({ exerciseId: 1, name: 'Жим', date: '2026-09-10' }),
      row({ exerciseId: 1, name: 'Жим', date: '2026-09-10' }),
      row({ exerciseId: 1, name: 'Жим', date: '2026-09-20' }),
      row({ exerciseId: 2, name: 'Тяга', date: '2026-09-25' }),
    ];
    expect(exerciseSummaries(rows).map((s) => [s.name, s.lastDate, s.sessions])).toEqual([
      ['Тяга', '2026-09-25', 1],
      ['Жим', '2026-09-20', 2],
    ]);
  });
});
