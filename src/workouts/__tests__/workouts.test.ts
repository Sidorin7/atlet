import { eq } from 'drizzle-orm';

import { sets, workoutExercises, workouts } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import type { AnyDb } from '@/db/types';
import { createExercise, createGroup, createProgram, updateProgram } from '@/library/repo';

import {
  addExerciseToDate,
  addProgramToDate,
  addSet,
  removeWorkout,
  reorderWorkoutExercises,
  repeatWorkout,
  updateSet,
} from '../repo';
import {
  daysSinceLastWorkout,
  doneDates,
  doneWorkoutStats,
  lastDoneWorkout,
  workoutExercisesOf,
  workoutMarks,
  workoutOnDate,
  workoutTiming,
} from '../queries';
import { toTiming } from '../timer';

let db: AnyDb;
let ids: number[];
beforeEach(async () => {
  db = await createTestDb();
  const g = createGroup(db, { name: 'Грудь', icon: 'chest' });
  ids = ['Жим', 'Разводка', 'Брусья'].map((name) => createExercise(db, { name, groupId: g, type: 'weight' }));
});

const namesOf = (workoutId: number) => workoutExercisesOf(db, workoutId).all().map((r) => r.name);

describe('addProgramToDate', () => {
  it('creates a workout copying the program name, colour and exercises in order', () => {
    const p = createProgram(db, { name: 'Push', color: 'coral', exerciseIds: [ids[2], ids[0]] });
    const w = addProgramToDate(db, '2026-09-29', p);
    expect(workoutOnDate(db, '2026-09-29').all()).toEqual([
      expect.objectContaining({ id: w, name: 'Push', color: 'coral', programId: p }),
    ]);
    expect(namesOf(w)).toEqual(['Брусья', 'Жим']);
  });

  it('keeps the workout unchanged when the program is edited afterwards', () => {
    const p = createProgram(db, { name: 'Push', color: 'coral', exerciseIds: [ids[0], ids[1]] });
    const w = addProgramToDate(db, '2026-09-29', p);
    updateProgram(db, p, { name: 'Pull', color: 'blue', exerciseIds: [ids[2]] });
    expect(namesOf(w)).toEqual(['Жим', 'Разводка']);
    expect(workoutOnDate(db, '2026-09-29').all()[0]).toMatchObject({ name: 'Push', color: 'coral' });
  });

  it('appends to the existing workout of that day instead of creating a second one', () => {
    const p1 = createProgram(db, { name: 'A', color: 'pink', exerciseIds: [ids[0]] });
    const p2 = createProgram(db, { name: 'B', color: 'blue', exerciseIds: [ids[1], ids[2]] });
    const w1 = addProgramToDate(db, '2026-09-29', p1);
    const w2 = addProgramToDate(db, '2026-09-29', p2);
    expect(w2).toBe(w1);
    expect(db.select().from(workouts).all()).toHaveLength(1);
    expect(namesOf(w1)).toEqual(['Жим', 'Разводка', 'Брусья']);
    expect(workoutOnDate(db, '2026-09-29').all()[0].name).toBe('A');
  });

  it('works for a past date', () => {
    const p = createProgram(db, { name: 'A', color: 'pink', exerciseIds: [ids[0]] });
    addProgramToDate(db, '2026-01-05', p);
    expect(workoutOnDate(db, '2026-01-05').all()).toHaveLength(1);
    expect(workoutOnDate(db, '2026-01-06').all()).toHaveLength(0);
  });
});

describe('addExerciseToDate', () => {
  it('creates an unnamed-program workout on first add, then appends', () => {
    const w = addExerciseToDate(db, '2026-09-29', ids[1], 'Тренировка');
    addExerciseToDate(db, '2026-09-29', ids[0], 'Тренировка');
    expect(workoutOnDate(db, '2026-09-29').all()[0]).toMatchObject({
      id: w,
      name: 'Тренировка',
      programId: null,
    });
    expect(namesOf(w)).toEqual(['Разводка', 'Жим']);
  });

  it('allows the same exercise twice in one workout', () => {
    const w = addExerciseToDate(db, '2026-09-29', ids[0], 'Тренировка');
    addExerciseToDate(db, '2026-09-29', ids[0], 'Тренировка');
    expect(namesOf(w)).toEqual(['Жим', 'Жим']);
  });
});

describe('workoutMarks', () => {
  const fillSet = (workoutId: number, values: Partial<typeof sets.$inferInsert>) => {
    const [we] = db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, workoutId)).all();
    db.insert(sets).values({ workoutExerciseId: we.id, position: 0, ...values }).run();
  };

  it('marks a workout with no filled sets as planned', () => {
    addExerciseToDate(db, '2026-09-29', ids[0], 'Т');
    expect(workoutMarks(db).all()).toEqual([{ date: '2026-09-29', done: 0 }]);
  });

  it('marks a workout with an empty set row as planned', () => {
    const w = addExerciseToDate(db, '2026-09-29', ids[0], 'Т');
    fillSet(w, {});
    expect(workoutMarks(db).all()[0].done).toBe(0);
  });

  it('marks a workout with at least one filled set as done', () => {
    const w = addExerciseToDate(db, '2026-09-29', ids[0], 'Т');
    fillSet(w, {});
    fillSet(w, { weightKg: 60, reps: 8 });
    expect(workoutMarks(db).all()).toEqual([{ date: '2026-09-29', done: 1 }]);
  });

  it('counts reps-only (bodyweight) and duration-only (cardio) sets as filled', () => {
    const w1 = addExerciseToDate(db, '2026-09-29', ids[0], 'Т');
    fillSet(w1, { reps: 12 });
    const w2 = addExerciseToDate(db, '2026-09-30', ids[0], 'Т');
    fillSet(w2, { durationSec: 600 });
    expect(workoutMarks(db).all().map((m) => m.done)).toEqual([1, 1]);
  });
});

describe('daysSinceLastWorkout', () => {
  const done = (date: string) => {
    const w = addExerciseToDate(db, date, ids[0], 'Т');
    const [we] = db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, w)).all();
    db.insert(sets).values({ workoutExerciseId: we.id, position: 0, weightKg: 50, reps: 5 }).run();
  };

  it('is null when nothing was ever done', () => {
    addExerciseToDate(db, '2026-09-20', ids[0], 'Т'); // planned only
    expect(daysSinceLastWorkout(db, '2026-09-29')).toBeNull();
  });

  it('counts days since the latest done workout on or before today', () => {
    done('2026-09-20');
    done('2026-09-25');
    done('2026-10-05'); // in the future relative to "today"
    expect(daysSinceLastWorkout(db, '2026-09-29')).toBe(4);
  });

  it('is 0 when today is done', () => {
    done('2026-09-29');
    expect(daysSinceLastWorkout(db, '2026-09-29')).toBe(0);
  });
});

describe('doneWorkoutStats', () => {
  it('counts only workouts with a filled set, once each, and finds the first date', () => {
    expect(doneWorkoutStats(db).all()[0]).toEqual({ count: 0, first: null });
    for (const date of ['2026-09-20', '2026-09-10']) {
      const w = addExerciseToDate(db, date, ids[0], 'Т');
      const [we] = db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, w)).all();
      db.insert(sets).values([
        { workoutExerciseId: we.id, position: 1, weightKg: 50, reps: 5 },
        { workoutExerciseId: we.id, position: 2, weightKg: 50, reps: 5 },
      ]).run();
    }
    addExerciseToDate(db, '2026-09-05', ids[0], 'Т'); // planned only
    expect(doneWorkoutStats(db).all()[0]).toEqual({ count: 2, first: '2026-09-10' });
  });
});

describe('removeWorkout', () => {
  it('deletes the workout with its exercises and sets', () => {
    const w = addExerciseToDate(db, '2026-09-29', ids[0], 'Т');
    const [we] = db.select().from(workoutExercises).all();
    db.insert(sets).values({ workoutExerciseId: we.id, position: 0, reps: 5 }).run();
    removeWorkout(db, w);
    expect(db.select().from(workouts).all()).toHaveLength(0);
    expect(db.select().from(workoutExercises).all()).toHaveLength(0);
    expect(db.select().from(sets).all()).toHaveLength(0);
  });
});

describe('reorderWorkoutExercises', () => {
  it('stores the new order, keeping each exercise with its sets', () => {
    const p = createProgram(db, { name: 'Push', color: 'coral', exerciseIds: ids });
    const w = addProgramToDate(db, '2026-09-29', p);
    const [a, b, c] = workoutExercisesOf(db, w).all().map((r) => r.id);
    db.update(sets).set({ reps: 8 }).where(eq(sets.workoutExerciseId, a)).run();
    reorderWorkoutExercises(db, [b, c, a]);
    expect(namesOf(w)).toEqual(['Разводка', 'Брусья', 'Жим']);
    expect(db.select().from(sets).where(eq(sets.workoutExerciseId, a)).get()?.reps).toBe(8);
  });

  it('keeps the order when more exercises are appended afterwards', () => {
    const p = createProgram(db, { name: 'Push', color: 'coral', exerciseIds: [ids[0], ids[1]] });
    const w = addProgramToDate(db, '2026-09-29', p);
    const [a, b] = workoutExercisesOf(db, w).all().map((r) => r.id);
    reorderWorkoutExercises(db, [b, a]);
    addExerciseToDate(db, '2026-09-29', ids[2], 'Т');
    expect(namesOf(w)).toEqual(['Разводка', 'Жим', 'Брусья']);
  });
});

describe('lastDoneWorkout and doneDates', () => {
  const done = (date: string, exerciseId = ids[0]) => {
    const w = addExerciseToDate(db, date, exerciseId, 'Т');
    const we = db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, w)).all().at(-1)!;
    db.insert(sets).values({ workoutExerciseId: we.id, position: 1, weightKg: 50, reps: 5 }).run();
    return w;
  };

  it('finds the latest done workout on or before today, ignoring planned ones', () => {
    done('2026-09-20');
    const last = done('2026-09-25');
    addExerciseToDate(db, '2026-09-27', ids[0], 'Т'); // planned only
    done('2026-10-05'); // future
    expect(lastDoneWorkout(db, '2026-09-29').all()).toEqual([{ id: last, date: '2026-09-25', name: 'Т' }]);
  });

  it('lists each done day once', () => {
    done('2026-09-20');
    done('2026-09-20', ids[1]);
    done('2026-09-25');
    addExerciseToDate(db, '2026-09-27', ids[0], 'Т');
    expect(doneDates(db).all().map((r) => r.date).sort()).toEqual(['2026-09-20', '2026-09-25']);
  });
});

describe('repeatWorkout', () => {
  it('copies the exercises in order with the same name and colour, sets empty', () => {
    const p = createProgram(db, { name: 'Push', color: 'coral', exerciseIds: [ids[2], ids[0]] });
    const source = addProgramToDate(db, '2026-09-20', p);
    const [first] = db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, source)).all();
    db.update(sets).set({ weightKg: 60, reps: 8 }).where(eq(sets.workoutExerciseId, first.id)).run();

    const w = repeatWorkout(db, source, '2026-09-29');
    expect(w).not.toBe(source);
    expect(workoutOnDate(db, '2026-09-29').all()[0]).toMatchObject({ name: 'Push', color: 'coral', programId: p });
    expect(namesOf(w)).toEqual(['Брусья', 'Жим']);
    const copied = workoutExercisesOf(db, w).all().map((we) => we.id);
    const copiedSets = db.select().from(sets).all().filter((s) => copied.includes(s.workoutExerciseId));
    expect(copiedSets.map((s) => [s.weightKg, s.reps])).toEqual([
      [null, null],
      [null, null],
    ]);
  });

  it('appends to a workout that already exists on that day', () => {
    const source = addExerciseToDate(db, '2026-09-20', ids[1], 'Т');
    const today = addExerciseToDate(db, '2026-09-29', ids[0], 'Сегодня');
    expect(repeatWorkout(db, source, '2026-09-29')).toBe(today);
    expect(namesOf(today)).toEqual(['Жим', 'Разводка']);
  });
});

describe('set timing', () => {
  const setup = () => {
    const w = addProgramToDate(db, '2026-09-29', createProgram(db, { name: 'A', color: 'pink', exerciseIds: [ids[0]] }));
    const we = db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, w)).get()!;
    const [first] = db.select().from(sets).where(eq(sets.workoutExerciseId, we.id)).all();
    return { w, we: we.id, first: first.id };
  };
  const loggedAt = (id: number) => db.select().from(sets).where(eq(sets.id, id)).get()!.loggedAt;

  it('stamps a set when it first gets a result and keeps that time on later edits', () => {
    const { first } = setup();
    updateSet(db, first, { weightKg: 60 }, 1000);
    expect(loggedAt(first)).toBeNull(); // weight alone is not a result
    updateSet(db, first, { reps: 8 }, 2000);
    updateSet(db, first, { reps: 10 }, 3000);
    expect(loggedAt(first)).toBe(2000);
    updateSet(db, first, { reps: null }, 4000);
    expect(loggedAt(first)).toBeNull();
  });

  it('reports when each set was logged and how many sets are still empty', () => {
    const { w, we, first } = setup();
    const timing = () => toTiming(workoutTiming(db, w).all());
    expect(timing()).toEqual({ times: [], empty: 1 });
    updateSet(db, first, { reps: 8 }, 1000);
    const second = addSet(db, we);
    expect(timing()).toEqual({ times: [1000], empty: 1 });
    updateSet(db, second, { reps: 8 }, 5000);
    expect(timing()).toEqual({ times: [1000, 5000], empty: 0 });
  });
});
