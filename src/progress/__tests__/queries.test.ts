import { sets, workoutExercises } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import type { AnyDb } from '@/db/types';
import { createExercise, createGroup } from '@/library/repo';
import { addExerciseToDate, addSet, updateSet } from '@/workouts/repo';
import { setsOf } from '@/workouts/queries';

import { progressRows } from '../queries';

let db: AnyDb;
let press: number;
beforeEach(async () => {
  db = await createTestDb();
  const g = createGroup(db, { name: 'Грудь', icon: 'chest' });
  press = createExercise(db, { name: 'Жим', groupId: g, type: 'weight' });
});

const weOf = (workoutId: number) =>
  db.select().from(workoutExercises).all().filter((w) => w.workoutId === workoutId)[0].id;

describe('progressRows', () => {
  it('returns only filled sets with exercise, group and workout date, in chronological order', () => {
    const later = addExerciseToDate(db, '2026-09-25', press, 'Т');
    const earlier = addExerciseToDate(db, '2026-09-20', press, 'Т');
    for (const [w, kg] of [[later, 65], [earlier, 60]] as const) {
      const we = weOf(w);
      const [first] = setsOf(db, we).all();
      updateSet(db, first.id, { weightKg: kg, reps: 8 });
      addSet(db, we); // stays empty
    }
    const rows = progressRows(db).all();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => [r.date, r.weightKg])).toEqual([
      ['2026-09-20', 60],
      ['2026-09-25', 65],
    ]);
    expect(rows[0]).toMatchObject({ exerciseId: press, name: 'Жим', groupIcon: 'chest', type: 'weight', reps: 8 });
  });

  it('keeps sets of one exercise in the order they were entered', () => {
    const w = addExerciseToDate(db, '2026-09-20', press, 'Т');
    const we = weOf(w);
    const [a] = setsOf(db, we).all();
    updateSet(db, a.id, { weightKg: 60, reps: 8 });
    const b = addSet(db, we);
    updateSet(db, b, { weightKg: 62.5, reps: 6 });
    expect(progressRows(db).all().map((r) => r.weightKg)).toEqual([60, 62.5]);
  });

  it('is empty when nothing has been filled', () => {
    addExerciseToDate(db, '2026-09-20', press, 'Т');
    expect(progressRows(db).all()).toEqual([]);
    expect(db.select().from(sets).all()).toHaveLength(1);
  });
});
