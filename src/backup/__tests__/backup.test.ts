import { exercises, muscleGroups, sets, settings } from '@/db/schema';
import { seedDefaults } from '@/db/seed';
import { createTestDb } from '@/db/test-db';
import type { AnyDb } from '@/db/types';
import { createExercise, createGroup, createProgram, deleteProgram, removeExercise } from '@/library/repo';
import { setSetting } from '@/settings/store-core';
import { addExerciseToDate, addProgramToDate, addSet, updateSet } from '@/workouts/repo';
import { setsOf, workoutExercisesOf, workoutOnDate } from '@/workouts/queries';

import {
  backupSummary,
  exportBackup,
  importBackup,
  InvalidBackupError,
  parseBackup,
  validateBackup,
  type BackupFile,
} from '../backup';

const NOW = new Date('2026-09-29T12:00:00.000Z');
const clean = (b: BackupFile) => ({ ...b, exportedAt: 'x' });

/** A database with a bit of everything the app can produce. */
async function richDb(): Promise<AnyDb> {
  const db = await createTestDb();
  const chest = createGroup(db, { name: 'Грудь', icon: 'chest' });
  const cardio = createGroup(db, { name: 'Кардио', icon: 'cardio' });
  const press = createExercise(db, { name: 'Жим', groupId: chest, type: 'weight' });
  const pullups = createExercise(db, { name: 'Подтягивания', groupId: chest, type: 'bodyweight' });
  const run = createExercise(db, { name: 'Бег', groupId: cardio, type: 'cardio' });
  const old = createExercise(db, { name: 'Старое', groupId: chest, type: 'weight' });
  const program = createProgram(db, { name: 'Push', color: 'coral', exerciseIds: [press, pullups] });
  const gone = createProgram(db, { name: 'Удалённая', color: 'blue', exerciseIds: [press] });

  const w1 = addProgramToDate(db, '2026-09-20', program);
  const [pressWe, pullWe] = workoutExercisesOf(db, w1).all();
  updateSet(db, setsOf(db, pressWe.id).all()[0].id, { weightKg: 72.5, reps: 8 });
  const extra = addSet(db, pressWe.id);
  updateSet(db, extra, { weightKg: 75, reps: 5 });
  updateSet(db, setsOf(db, pullWe.id).all()[0].id, { weightKg: -20, reps: 6 });

  const w2 = addExerciseToDate(db, '2026-09-25', run, 'Тренировка');
  const [runWe] = workoutExercisesOf(db, w2).all();
  updateSet(db, setsOf(db, runWe.id).all()[0].id, { durationSec: 1500, distanceM: 5000 });

  addExerciseToDate(db, '2026-10-05', old, 'Тренировка'); // planned
  addProgramToDate(db, '2026-10-06', gone);
  deleteProgram(db, gone); // leaves a workout with programId = null
  removeExercise(db, old); // has history → archived

  db.insert(settings).values({ key: 'seeded', value: '1' }).run();
  setSetting(db, 'theme', 'dark');
  setSetting(db, 'language', 'en');
  return db;
}

describe('exportBackup', () => {
  it('describes the app, version and time, and lists every table', async () => {
    const db = await richDb();
    const b = exportBackup(db, NOW);
    expect(b).toMatchObject({ app: 'gymapp', version: 1, exportedAt: '2026-09-29T12:00:00.000Z' });
    expect(Object.keys(b.data).sort()).toEqual(
      ['exercises', 'muscleGroups', 'programExercises', 'programs', 'sets', 'settings', 'workoutExercises', 'workouts'],
    );
    expect(b.data.muscleGroups).toHaveLength(2);
    expect(b.data.workouts).toHaveLength(4);
  });
});

describe('round trip', () => {
  it('export → import into an empty database → export gives identical data', async () => {
    const source = await richDb();
    const before = exportBackup(source, NOW);
    const target = await createTestDb();
    importBackup(target, validateBackup(JSON.parse(JSON.stringify(before))));
    expect(clean(exportBackup(target, NOW))).toEqual(clean(before));
  });

  it('keeps every value: negative loads, cardio units, archived flag, orphaned workout', async () => {
    const source = await richDb();
    const target = await createTestDb();
    importBackup(target, validateBackup(JSON.parse(JSON.stringify(exportBackup(source, NOW)))));
    const b = exportBackup(target, NOW).data;
    expect(b.sets.some((s) => s.weightKg === -20 && s.reps === 6)).toBe(true);
    expect(b.sets.some((s) => s.durationSec === 1500 && s.distanceM === 5000)).toBe(true);
    expect(b.exercises.find((e) => e.name === 'Старое')?.archived).toBe(true);
    expect(b.workouts.find((w) => w.date === '2026-10-06')?.programId).toBeNull();
    expect(workoutOnDate(target, '2026-09-20').all()[0].name).toBe('Push');
  });

  it('replaces whatever was in the database before', async () => {
    const source = await richDb();
    const target = await createTestDb();
    const g = createGroup(target, { name: 'Лишняя', icon: 'abs' });
    createExercise(target, { name: 'Лишнее', groupId: g, type: 'weight' });
    importBackup(target, exportBackup(source, NOW));
    expect(target.select().from(muscleGroups).all().map((x) => x.name).sort()).toEqual(['Грудь', 'Кардио']);
    expect(target.select().from(exercises).all().map((x) => x.name)).not.toContain('Лишнее');
  });

  it('restores theme and language', async () => {
    const target = await createTestDb();
    importBackup(target, exportBackup(await richDb(), NOW));
    const map = new Map(target.select().from(settings).all().map((r) => [r.key, r.value]));
    expect(map.get('theme')).toBe('dark');
    expect(map.get('language')).toBe('en');
  });

  it('marks the database as seeded even if the backup has no settings, so default groups do not return', async () => {
    const b = exportBackup(await richDb(), NOW);
    const target = await createTestDb();
    importBackup(target, {
      ...b,
      data: { ...b.data, muscleGroups: [], exercises: [], programs: [], programExercises: [], workouts: [], workoutExercises: [], sets: [], settings: [] },
    });
    seedDefaults(target, 'ru');
    expect(target.select().from(muscleGroups).all()).toHaveLength(0);
  });

  it('handles thousands of sets', async () => {
    const source = await richDb();
    const b = exportBackup(source, NOW);
    const [we] = b.data.workoutExercises;
    const many = Array.from({ length: 3000 }, (_, i) => ({
      id: 10_000 + i, workoutExerciseId: we.id, position: 100 + i, weightKg: 50, reps: 5, durationSec: null, distanceM: null, loggedAt: null,
    }));
    const target = await createTestDb();
    importBackup(target, { ...b, data: { ...b.data, sets: [...b.data.sets, ...many] } });
    expect(target.select().from(sets).all()).toHaveLength(b.data.sets.length + 3000);
  });
});

describe('validateBackup', () => {
  const good = async () => JSON.parse(JSON.stringify(exportBackup(await richDb(), NOW)));
  const bad = (value: unknown) => expect(() => validateBackup(value)).toThrow(InvalidBackupError);

  it('accepts a real export', async () => {
    const b = await good();
    expect(() => validateBackup(b)).not.toThrow();
  });

  it('accepts sets from before set times were saved, reading the missing time as null', async () => {
    const b = await good();
    for (const s of b.data.sets) delete s.loggedAt;
    expect(validateBackup(b).data.sets.every((s) => s.loggedAt === null)).toBe(true);
    bad({ ...b, data: { ...b.data, sets: [{ ...b.data.sets[0], loggedAt: 'noon' }] } });
  });

  it('rejects things that are not a GymApp v1 backup', async () => {
    bad(null);
    bad('text');
    bad([]);
    bad({});
    const b = await good();
    bad({ ...b, app: 'other' });
    bad({ ...b, version: 2 });
    bad({ ...b, version: '1' });
    bad({ ...b, data: undefined });
  });

  it('rejects a missing table or one that is not a list', async () => {
    const b = await good();
    const { sets: _sets, ...rest } = b.data;
    bad({ ...b, data: rest });
    bad({ ...b, data: { ...b.data, sets: {} } });
  });

  it('rejects wrong field types and values', async () => {
    const b = await good();
    const patch = (table: string, change: object) => ({
      ...b,
      data: { ...b.data, [table]: b.data[table].map((r: object, i: number) => (i === 0 ? { ...r, ...change } : r)) },
    });
    bad(patch('sets', { weightKg: '60' }));
    bad(patch('sets', { reps: 8.5 }));
    bad(patch('exercises', { type: 'yoga' }));
    bad(patch('exercises', { archived: 'no' }));
    bad(patch('workouts', { date: '29.09.2026' }));
    bad(patch('workouts', { date: '2026-13-40' }));
    bad(patch('muscleGroups', { name: 5 }));
    bad(patch('muscleGroups', { id: 1.5 }));
  });

  it('rejects duplicate ids', async () => {
    const b = await good();
    bad({ ...b, data: { ...b.data, muscleGroups: [...b.data.muscleGroups, b.data.muscleGroups[0]] } });
  });

  it('rejects references to rows that do not exist', async () => {
    const b = await good();
    const patch = (table: string, change: object) => ({
      ...b,
      data: { ...b.data, [table]: b.data[table].map((r: object, i: number) => (i === 0 ? { ...r, ...change } : r)) },
    });
    bad(patch('exercises', { groupId: 9999 }));
    bad(patch('programExercises', { programId: 9999 }));
    bad(patch('programExercises', { exerciseId: 9999 }));
    bad(patch('workouts', { programId: 9999 }));
    bad(patch('workoutExercises', { workoutId: 9999 }));
    bad(patch('workoutExercises', { exerciseId: 9999 }));
    bad(patch('sets', { workoutExerciseId: 9999 }));
  });

  it('ignores unknown extra fields so newer exports of the same version still load', async () => {
    const b = await good();
    const extra = { ...b, note: 'x', data: { ...b.data, sets: b.data.sets.map((s: object) => ({ ...s, futureField: 1 })) } };
    const parsed = validateBackup(extra);
    expect(parsed.data.sets[0]).not.toHaveProperty('futureField');
  });
});

describe('parseBackup', () => {
  it('reads JSON text and reports broken text as an invalid backup', async () => {
    const text = JSON.stringify(exportBackup(await richDb(), NOW));
    expect(parseBackup(text).app).toBe('gymapp');
    expect(() => parseBackup('{not json')).toThrow(InvalidBackupError);
    expect(() => parseBackup('')).toThrow(InvalidBackupError);
  });
});

describe('import is all or nothing', () => {
  it('leaves the existing data untouched when the import fails halfway', async () => {
    const target = await richDb();
    const before = clean(exportBackup(target, NOW));
    const other = exportBackup(await richDb(), NOW);
    // Passes validation but violates a database rule: two settings rows with the same key.
    const broken = { ...other, data: { ...other.data, settings: [...other.data.settings, other.data.settings[0]] } };
    expect(() => importBackup(target, broken)).toThrow();
    expect(clean(exportBackup(target, NOW))).toEqual(before);
  });
});

describe('backupSummary', () => {
  it('counts workouts, visible exercises, programs and filled sets', async () => {
    const s = backupSummary(exportBackup(await richDb(), NOW));
    expect(s).toEqual({ workouts: 4, exercises: 3, programs: 1, sets: 4 });
  });
});
