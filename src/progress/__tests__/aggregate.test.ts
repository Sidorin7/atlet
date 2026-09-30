import {
  exerciseHistory,
  exerciseTrends,
  groupBalance,
  heatmapWeeks,
  recentRecords,
  setScore,
  trainingDays,
  weekStreak,
  workoutsInLast,
  exerciseSeries,
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
  groupId: 1,
  groupName: 'Грудь',
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

describe('rangeStart', () => {
  it('goes back a fixed number of days, or is unbounded for all', () => {
    expect(rangeStart('2026-09-30', 'week')).toBe('2026-09-23');
    expect(rangeStart('2026-09-30', 'month')).toBe('2026-08-31');
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

  it('leaves out days before the start of the range', () => {
    const rows = [row({ date: '2026-09-20' }), row({ date: '2026-09-25' })];
    expect(exerciseHistory(rows, 1, '2026-09-23').map((d) => d.date)).toEqual(['2026-09-25']);
  });
});

describe('setScore', () => {
  it('weights: estimated 1RM, a single counts as is', () => {
    expect(setScore(row({ weightKg: 90, reps: 5 }))).toBe(105);
    expect(setScore(row({ weightKg: 100, reps: 1 }))).toBe(100);
    expect(setScore(row({ weightKg: 0, reps: 5 }))).toBeNull();
  });
  it('bodyweight: reps; cardio: distance or time', () => {
    expect(setScore(row({ type: 'bodyweight', weightKg: 10, reps: 12 }))).toBe(12);
    const run = row({ type: 'cardio', weightKg: null, reps: null, durationSec: 1500, distanceM: 5000 });
    expect(setScore(run, 'distance')).toBe(5000);
    expect(setScore(run, 'time')).toBe(1500);
  });
});

describe('consistency', () => {
  const today = '2026-09-30'; // Wednesday
  it('keeps the streak when this week has no workout yet', () => {
    const days = trainingDays([row({ date: '2026-09-22' }), row({ date: '2026-09-15' }), row({ date: '2026-09-01' })]);
    expect(weekStreak(days, today)).toBe(2);
    expect(weekStreak(new Set(['2026-09-29', ...days]), today)).toBe(3);
    expect(weekStreak(new Set(['2026-09-08']), today)).toBe(0);
  });
  it('counts workout days in the last n days, today included', () => {
    const days = new Set(['2026-09-30', '2026-09-01', '2026-08-31', '2026-10-01']);
    expect(workoutsInLast(days, today, 30)).toBe(2);
  });
  it('lays out whole weeks, Monday first, marking trained and future days', () => {
    const weeks = heatmapWeeks(new Set(['2026-09-29']), today, 2);
    expect(weeks.map((w) => w[0].date)).toEqual(['2026-09-21', '2026-09-28']);
    expect(weeks[1][1]).toEqual({ date: '2026-09-29', trained: true, future: false });
    expect(weeks[1][3].future).toBe(true);
  });
});

describe('recentRecords', () => {
  it('reports days that beat every earlier day, not the first day, newest first', () => {
    const rows = [
      row({ date: '2026-09-01', weightKg: 80, reps: 5 }),
      row({ date: '2026-09-08', weightKg: 75, reps: 5 }),
      row({ date: '2026-09-15', weightKg: 82.5, reps: 5 }),
      row({ date: '2026-09-15', weightKg: 60, reps: 10 }),
      row({ date: '2026-09-22', weightKg: 85, reps: 5 }),
      row({ exerciseId: 2, date: '2026-09-20', type: 'bodyweight', weightKg: null, reps: 10 }),
    ];
    const records = recentRecords(rows, 5);
    expect(records.map((r) => [r.date, r.row.weightKg, r.previous.weightKg])).toEqual([
      ['2026-09-22', 85, 82.5],
      ['2026-09-15', 82.5, 80],
    ]);
    expect(recentRecords(rows, 1)).toHaveLength(1);
  });
});

describe('groupBalance', () => {
  const groups = [
    { id: 1, name: 'Грудь', icon: 'chest' },
    { id: 2, name: 'Спина', icon: 'back' },
  ];
  it('counts sets since the start and keeps untrained groups', () => {
    const rows = [row({ date: '2026-09-10' }), row({ date: '2026-09-28' }), row({ date: '2026-09-29' })];
    expect(groupBalance(rows, groups, '2026-09-28')).toEqual([
      { group: groups[0], sets: 2, lastDate: '2026-09-29' },
      { group: groups[1], sets: 0, lastDate: null },
    ]);
  });
});

describe('exerciseTrends', () => {
  const today = '2026-09-30';
  it('compares the best of the last 4 weeks with the 4 weeks before', () => {
    const rows = [row({ date: '2026-08-20', weightKg: 100, reps: 1 }), row({ date: '2026-09-20', weightKg: 106, reps: 1 })];
    const [t] = exerciseTrends(rows, today);
    expect(t).toMatchObject({ exerciseId: 1, change: 6, lastDate: '2026-09-20' });
    expect(t.best.weightKg).toBe(106);
  });
  it('is new with nothing before, and unknown when not trained lately', () => {
    expect(exerciseTrends([row({ date: '2026-09-20' })], today)[0].change).toBe('new');
    const old = exerciseTrends([row({ date: '2026-06-01', weightKg: 70 })], today)[0];
    expect(old.change).toBeNull();
    expect(old.best.weightKg).toBe(70);
  });
  it('lists the most recently trained first', () => {
    const rows = [row({ exerciseId: 1, date: '2026-09-01' }), row({ exerciseId: 2, name: 'Тяга', date: '2026-09-25' })];
    expect(exerciseTrends(rows, today).map((t) => t.exerciseId)).toEqual([2, 1]);
  });
});
