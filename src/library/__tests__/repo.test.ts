import { createTestDb } from '@/db/test-db';
import type { AnyDb } from '@/db/types';
import { seedDefaults } from '@/db/seed';
import { eq, sql } from 'drizzle-orm';
import { exercises, muscleGroups, programExercises, workoutExercises, workouts } from '@/db/schema';

import {
  createExercise,
  createGroup,
  createProgram,
  deleteGroup,
  deleteProgram,
  GroupNotEmptyError,
  removeExercise,
  updateExercise,
  updateGroup,
  updateProgram,
} from '../repo';
import {
  exercisesInGroup,
  groupsWithCounts,
  programExercisesOf,
  programsWithCounts,
} from '../queries';

let db: AnyDb;
beforeEach(async () => {
  db = await createTestDb();
});

describe('groups', () => {
  it('appends new groups at the end and counts only non-archived exercises', () => {
    const a = createGroup(db, { name: 'Грудь', icon: 'chest' });
    createGroup(db, { name: 'Спина', icon: 'back' });
    createExercise(db, { name: 'Жим', groupId: a, type: 'weight' });
    const old = createExercise(db, { name: 'Старое', groupId: a, type: 'weight' });
    db.update(exercises).set({ archived: true }).where(eq(exercises.id, old)).run();

    const rows = groupsWithCounts(db).all();
    expect(rows.map((r) => [r.name, r.position])).toEqual([['Грудь', 0], ['Спина', 1]]);
    expect(rows.map((r) => r.exerciseCount)).toEqual([1, 0]);
  });

  it('renames and changes the icon', () => {
    const id = createGroup(db, { name: 'Ноги', icon: 'legs' });
    updateGroup(db, id, { name: 'Ноги и ягодицы', icon: 'abs' });
    const [g] = groupsWithCounts(db).all();
    expect(g).toMatchObject({ name: 'Ноги и ягодицы', icon: 'abs' });
  });

  it('refuses to delete a group that still has exercises, deletes an empty one', () => {
    const id = createGroup(db, { name: 'Грудь', icon: 'chest' });
    createExercise(db, { name: 'Жим', groupId: id, type: 'weight' });
    expect(() => deleteGroup(db, id)).toThrow(GroupNotEmptyError);
    expect(groupsWithCounts(db).all()).toHaveLength(1);

    const empty = createGroup(db, { name: 'Пусто', icon: 'abs' });
    deleteGroup(db, empty);
    expect(groupsWithCounts(db).all().map((g) => g.name)).toEqual(['Грудь']);
  });
});

describe('exercises', () => {
  it('counts exercises per group and lists them by name', () => {
    const g = createGroup(db, { name: 'Грудь', icon: 'chest' });
    createExercise(db, { name: 'Жим лёжа', groupId: g, type: 'weight' });
    createExercise(db, { name: 'Отжимания', groupId: g, type: 'bodyweight' });
    expect(groupsWithCounts(db).all()[0].exerciseCount).toBe(2);
    expect(exercisesInGroup(db, g).all().map((e) => e.name)).toEqual(['Жим лёжа', 'Отжимания']);
  });

  it('updates name, group and type', () => {
    const g1 = createGroup(db, { name: 'A', icon: 'chest' });
    const g2 = createGroup(db, { name: 'B', icon: 'back' });
    const id = createExercise(db, { name: 'Тяга', groupId: g1, type: 'weight' });
    updateExercise(db, id, { name: 'Подтягивания', groupId: g2, type: 'bodyweight' });
    expect(exercisesInGroup(db, g1).all()).toHaveLength(0);
    expect(exercisesInGroup(db, g2).all()[0]).toMatchObject({
      name: 'Подтягивания',
      type: 'bodyweight',
    });
  });

  it('deletes an exercise without history and drops it from programs', () => {
    const g = createGroup(db, { name: 'A', icon: 'chest' });
    const e = createExercise(db, { name: 'Жим', groupId: g, type: 'weight' });
    const p = createProgram(db, { name: 'Push', color: 'pink', exerciseIds: [e] });
    removeExercise(db, e);
    expect(exercisesInGroup(db, g).all()).toHaveLength(0);
    expect(programExercisesOf(db, p).all()).toHaveLength(0);
  });

  it('archives an exercise that has history instead of deleting it', () => {
    const g = createGroup(db, { name: 'A', icon: 'chest' });
    const e = createExercise(db, { name: 'Жим', groupId: g, type: 'weight' });
    const p = createProgram(db, { name: 'Push', color: 'pink', exerciseIds: [e] });
    const [w] = db
      .insert(workouts)
      .values({ date: '2026-09-01', name: 'W', color: 'pink' })
      .returning()
      .all();
    db.insert(workoutExercises).values({ workoutId: w.id, exerciseId: e, position: 0 }).run();

    removeExercise(db, e);

    expect(exercisesInGroup(db, g).all()).toHaveLength(0); // hidden from library
    expect(groupsWithCounts(db).all()[0].exerciseCount).toBe(0);
    expect(programExercisesOf(db, p).all()).toHaveLength(0); // gone from the program
    expect(db.select().from(workoutExercises).all()).toHaveLength(1); // history intact
    expect(() => deleteGroup(db, g)).toThrow(GroupNotEmptyError); // FK still references it
  });
});

describe('programs', () => {
  function setup() {
    const g = createGroup(db, { name: 'A', icon: 'chest' });
    const ids = ['Жим', 'Разводка', 'Брусья'].map((name) =>
      createExercise(db, { name, groupId: g, type: 'weight' }),
    );
    return ids;
  }

  it('stores exercises in the given order and reports the count', () => {
    const [a, b, c] = setup();
    const p = createProgram(db, { name: 'Push', color: 'coral', exerciseIds: [c, a, b] });
    expect(programExercisesOf(db, p).all().map((r) => r.name)).toEqual(['Брусья', 'Жим', 'Разводка']);
    expect(programsWithCounts(db).all()).toEqual([
      expect.objectContaining({ id: p, name: 'Push', color: 'coral', exerciseCount: 3 }),
    ]);
  });

  it('allows the same exercise twice in a program', () => {
    const [a] = setup();
    const p = createProgram(db, { name: 'X', color: 'blue', exerciseIds: [a, a] });
    expect(programExercisesOf(db, p).all()).toHaveLength(2);
  });

  it('updates name, color and replaces the exercise list', () => {
    const [a, b, c] = setup();
    const p = createProgram(db, { name: 'Push', color: 'coral', exerciseIds: [a, b] });
    updateProgram(db, p, { name: 'Pull', color: 'amber', exerciseIds: [c, a] });
    expect(programsWithCounts(db).all()[0]).toMatchObject({
      name: 'Pull',
      color: 'amber',
      exerciseCount: 2,
    });
    expect(programExercisesOf(db, p).all().map((r) => r.name)).toEqual(['Брусья', 'Жим']);
  });

  it('deleting a program removes its items but keeps workouts made from it', () => {
    const [a] = setup();
    const p = createProgram(db, { name: 'Push', color: 'pink', exerciseIds: [a] });
    db.insert(workouts).values({ date: '2026-09-01', programId: p, name: 'Push', color: 'pink' }).run();
    deleteProgram(db, p);
    expect(programsWithCounts(db).all()).toHaveLength(0);
    expect(db.select().from(programExercises).all()).toHaveLength(0);
    expect(db.select().from(workouts).all()).toEqual([
      expect.objectContaining({ programId: null, name: 'Push' }),
    ]);
  });

  it('rolls back a failed update entirely (transaction)', () => {
    const [a] = setup();
    const p = createProgram(db, { name: 'Push', color: 'pink', exerciseIds: [a] });
    expect(() => updateProgram(db, p, { name: 'New', color: 'blue', exerciseIds: [a, 99999] })).toThrow();
    expect(programsWithCounts(db).all()[0]).toMatchObject({ name: 'Push', color: 'pink', exerciseCount: 1 });
  });
});

describe('seedDefaults', () => {
  it('creates the 8 default groups once', () => {
    seedDefaults(db, 'ru');
    seedDefaults(db, 'ru');
    expect(db.select().from(muscleGroups).all()).toHaveLength(8);
  });

  it('does not recreate groups the user deleted', () => {
    seedDefaults(db, 'ru');
    db.delete(muscleGroups).run();
    seedDefaults(db, 'ru');
    expect(db.select().from(muscleGroups).all()).toHaveLength(0);
  });

  it('is atomic: if marking as seeded fails, the groups are rolled back too', () => {
    db.run(sql`CREATE TRIGGER fail_seed BEFORE INSERT ON settings BEGIN SELECT RAISE(ABORT, 'boom'); END`);
    expect(() => seedDefaults(db, 'ru')).toThrow();
    expect(db.select().from(muscleGroups).all()).toHaveLength(0);
  });
});
