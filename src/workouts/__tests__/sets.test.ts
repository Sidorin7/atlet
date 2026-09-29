import { eq } from 'drizzle-orm';

import { sets, workoutExercises, workouts } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import type { AnyDb } from '@/db/types';
import { createExercise, createGroup, createProgram } from '@/library/repo';

import {
  addProgramToDate,
  addExerciseToDate,
  addSet,
  deleteSet,
  moveWorkout,
  removeWorkoutExercise,
  renameWorkout,
  updateSet,
} from '../repo';
import {
  previousSets,
  setsOf,
  workoutExercisesOf,
  workoutOnDate,
  workoutSetSummary,
} from '../queries';

let db: AnyDb;
let ex: number[];
beforeEach(async () => {
  db = await createTestDb();
  const g = createGroup(db, { name: 'Грудь', icon: 'chest' });
  ex = ['Жим', 'Разводка', 'Брусья'].map((name) => createExercise(db, { name, groupId: g, type: 'weight' }));
});

const firstWe = (workoutId: number) => workoutExercisesOf(db, workoutId).all()[0].id;
const filledSet = (weId: number, position: number, weightKg: number, reps: number) =>
  db.insert(sets).values({ workoutExerciseId: weId, position, weightKg, reps }).run();

describe('empty sets on add', () => {
  it('gives every exercise added from a program one empty set', () => {
    const p = createProgram(db, { name: 'P', color: 'pink', exerciseIds: [ex[0], ex[1]] });
    const w = addProgramToDate(db, '2026-09-29', p);
    for (const we of workoutExercisesOf(db, w).all()) {
      expect(setsOf(db, we.id).all()).toEqual([
        expect.objectContaining({ position: 0, weightKg: null, reps: null }),
      ]);
    }
  });

  it('gives a single added exercise one empty set', () => {
    const w = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    expect(setsOf(db, firstWe(w)).all()).toHaveLength(1);
  });
});

describe('sets', () => {
  it('addSet appends after the last position', () => {
    const w = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    const we = firstWe(w);
    addSet(db, we);
    addSet(db, we);
    expect(setsOf(db, we).all().map((s) => s.position)).toEqual([0, 1, 2]);
  });

  it('updateSet changes only the given fields and null clears one', () => {
    const w = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    const [s] = setsOf(db, firstWe(w)).all();
    updateSet(db, s.id, { weightKg: 72.5, reps: 8 });
    updateSet(db, s.id, { reps: 10 });
    expect(setsOf(db, firstWe(w)).all()[0]).toMatchObject({ weightKg: 72.5, reps: 10 });
    updateSet(db, s.id, { weightKg: null });
    expect(setsOf(db, firstWe(w)).all()[0]).toMatchObject({ weightKg: null, reps: 10 });
  });

  it('stores a negative load for assisted bodyweight exercises', () => {
    const w = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    const [s] = setsOf(db, firstWe(w)).all();
    updateSet(db, s.id, { weightKg: -20, reps: 6 });
    expect(setsOf(db, firstWe(w)).all()[0].weightKg).toBe(-20);
  });

  it('deleteSet removes just that set', () => {
    const w = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    const we = firstWe(w);
    addSet(db, we);
    const [first, second] = setsOf(db, we).all();
    deleteSet(db, first.id);
    expect(setsOf(db, we).all().map((s) => s.id)).toEqual([second.id]);
  });

  it('removeWorkoutExercise deletes the exercise and its sets but keeps the workout', () => {
    const w = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    addExerciseToDate(db, '2026-09-29', ex[1], 'Т');
    removeWorkoutExercise(db, firstWe(w));
    expect(workoutExercisesOf(db, w).all().map((e) => e.name)).toEqual(['Разводка']);
    expect(db.select().from(sets).all()).toHaveLength(1);
    expect(db.select().from(workouts).all()).toHaveLength(1);
  });
});

describe('workoutSetSummary', () => {
  it('counts filled sets per workout exercise', () => {
    const w = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    addExerciseToDate(db, '2026-09-29', ex[1], 'Т');
    const [a, b] = workoutExercisesOf(db, w).all();
    const [empty] = setsOf(db, a.id).all();
    updateSet(db, empty.id, { weightKg: 50, reps: 5 });
    addSet(db, a.id);
    const summary = new Map(workoutSetSummary(db, w).all().map((r) => [r.workoutExerciseId, r.filled]));
    expect(summary.get(a.id)).toBe(1);
    expect(summary.get(b.id) ?? 0).toBe(0);
  });
});

describe('previousSets ("last time")', () => {
  const doneWorkout = (date: string, exerciseId: number, rows: [number, number][]) => {
    const w = addExerciseToDate(db, date, exerciseId, 'Т');
    const we = workoutExercisesOf(db, w).all().find((e) => e.exerciseId === exerciseId)!.id;
    db.delete(sets).where(eq(sets.workoutExerciseId, we)).run();
    rows.forEach(([kg, reps], i) => filledSet(we, i, kg, reps));
    return w;
  };

  it('returns the sets of the latest earlier workout that has the exercise', () => {
    doneWorkout('2026-09-10', ex[0], [[50, 10]]);
    doneWorkout('2026-09-20', ex[0], [[60, 8], [62.5, 6]]);
    expect(previousSets(db, ex[0], '2026-09-29').map((s) => [s.weightKg, s.reps])).toEqual([
      [60, 8],
      [62.5, 6],
    ]);
  });

  it('ignores the same day and later days', () => {
    doneWorkout('2026-09-29', ex[0], [[70, 5]]);
    doneWorkout('2026-10-05', ex[0], [[80, 3]]);
    expect(previousSets(db, ex[0], '2026-09-29')).toEqual([]);
  });

  it('skips earlier workouts where the exercise has no filled set', () => {
    doneWorkout('2026-09-10', ex[0], [[50, 10]]);
    addExerciseToDate(db, '2026-09-20', ex[0], 'Т'); // planned, only an empty set
    expect(previousSets(db, ex[0], '2026-09-29').map((s) => s.weightKg)).toEqual([50]);
  });

  it('only considers the same exercise', () => {
    doneWorkout('2026-09-20', ex[1], [[20, 12]]);
    expect(previousSets(db, ex[0], '2026-09-29')).toEqual([]);
  });

  it('leaves out empty rows so ghost values line up with real sets', () => {
    const w = doneWorkout('2026-09-20', ex[0], [[60, 8]]);
    addSet(db, firstWe(w));
    expect(previousSets(db, ex[0], '2026-09-29')).toHaveLength(1);
  });
});

describe('renameWorkout', () => {
  it('trims the name and ignores a blank one', () => {
    const w = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    renameWorkout(db, w, '  Ноги  ');
    expect(workoutOnDate(db, '2026-09-29').all()[0].name).toBe('Ноги');
    renameWorkout(db, w, '   ');
    expect(workoutOnDate(db, '2026-09-29').all()[0].name).toBe('Ноги');
  });
});

describe('moveWorkout', () => {
  it('changes the date of a workout, keeping its exercises and sets', () => {
    const w = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    filledSet(firstWe(w), 1, 60, 8);
    moveWorkout(db, w, '2026-10-03');
    expect(workoutOnDate(db, '2026-09-29').all()).toHaveLength(0);
    const moved = workoutOnDate(db, '2026-10-03').all()[0];
    expect(moved.id).toBe(w);
    expect(setsOf(db, firstWe(w)).all()).toHaveLength(2);
  });

  it('merges into the workout already on the target day', () => {
    const src = addExerciseToDate(db, '2026-09-29', ex[0], 'Источник');
    filledSet(firstWe(src), 1, 60, 8);
    const target = addExerciseToDate(db, '2026-10-03', ex[1], 'Цель');
    const result = moveWorkout(db, src, '2026-10-03');

    expect(result).toBe(target);
    expect(db.select().from(workouts).all()).toHaveLength(1);
    expect(workoutOnDate(db, '2026-10-03').all()[0].name).toBe('Цель');
    expect(workoutExercisesOf(db, target).all().map((e) => e.name)).toEqual(['Разводка', 'Жим']);
    const pressWe = workoutExercisesOf(db, target).all()[1].id;
    expect(setsOf(db, pressWe).all()).toHaveLength(2); // sets travelled with the exercise
  });

  it('does nothing when moved to the same day', () => {
    const w = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    expect(moveWorkout(db, w, '2026-09-29')).toBe(w);
    expect(db.select().from(workouts).all()).toHaveLength(1);
  });
});

describe('cascade', () => {
  it('deleting a workout exercise via removeWorkoutExercise leaves other workouts alone', () => {
    const a = addExerciseToDate(db, '2026-09-29', ex[0], 'Т');
    addExerciseToDate(db, '2026-09-30', ex[0], 'Т');
    removeWorkoutExercise(db, firstWe(a));
    expect(db.select().from(workoutExercises).all()).toHaveLength(1);
  });
});
