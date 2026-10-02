import { asc } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import {
  exercises,
  muscleGroups,
  programExercises,
  programs,
  sets,
  settings,
  workoutExercises,
  workouts,
} from '@/db/schema';
import type { AnyDb, Reader } from '@/db/types';

export const BACKUP_VERSION = 1;

type Row<T extends SQLiteTable> = T['$inferSelect'];

export type BackupData = {
  muscleGroups: Row<typeof muscleGroups>[];
  exercises: Row<typeof exercises>[];
  programs: Row<typeof programs>[];
  programExercises: Row<typeof programExercises>[];
  workouts: Row<typeof workouts>[];
  workoutExercises: Row<typeof workoutExercises>[];
  sets: Row<typeof sets>[];
  settings: Row<typeof settings>[];
};

export type BackupFile = { app: 'gymapp'; version: typeof BACKUP_VERSION; exportedAt: string; data: BackupData };

export class InvalidBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBackupError';
    Object.setPrototypeOf(this, InvalidBackupError.prototype); // keep instanceof working after transpilation
  }
}

// ── export ──────────────────────────────────────────────────────────────────

export function exportBackup(db: Reader, now: Date = new Date()): BackupFile {
  return {
    app: 'gymapp',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: {
      muscleGroups: db.select().from(muscleGroups).orderBy(asc(muscleGroups.id)).all(),
      exercises: db.select().from(exercises).orderBy(asc(exercises.id)).all(),
      programs: db.select().from(programs).orderBy(asc(programs.id)).all(),
      programExercises: db.select().from(programExercises).orderBy(asc(programExercises.id)).all(),
      workouts: db.select().from(workouts).orderBy(asc(workouts.id)).all(),
      workoutExercises: db.select().from(workoutExercises).orderBy(asc(workoutExercises.id)).all(),
      sets: db.select().from(sets).orderBy(asc(sets.id)).all(),
      settings: db.select().from(settings).orderBy(asc(settings.key)).all(),
    },
  };
}

// ── validation ──────────────────────────────────────────────────────────────

// 'new-int?' is a nullable int added after version 1 shipped: older backups lack it, read as null.
type Kind = 'int' | 'int?' | 'new-int?' | 'num?' | 'str' | 'bool' | 'date' | 'type';

const SPEC: { [T in keyof BackupData]: Record<string, Kind> } = {
  muscleGroups: { id: 'int', name: 'str', icon: 'str', position: 'int' },
  exercises: { id: 'int', name: 'str', groupId: 'int', type: 'type', archived: 'bool' },
  programs: { id: 'int', name: 'str', color: 'str', createdAt: 'str' },
  programExercises: { id: 'int', programId: 'int', exerciseId: 'int', position: 'int' },
  workouts: { id: 'int', date: 'date', programId: 'int?', name: 'str', color: 'str', createdAt: 'str' },
  workoutExercises: { id: 'int', workoutId: 'int', exerciseId: 'int', position: 'int' },
  sets: {
    id: 'int',
    workoutExerciseId: 'int',
    position: 'int',
    weightKg: 'num?',
    reps: 'int?',
    durationSec: 'int?',
    distanceM: 'num?',
    loggedAt: 'new-int?',
  },
  settings: { key: 'str', value: 'str' },
};

const isDate = (v: unknown) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};

const isInt = (v: unknown) => typeof v === 'number' && Number.isInteger(v);
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

const CHECKS: Record<Kind, (v: unknown) => boolean> = {
  int: isInt,
  'int?': (v) => v === null || isInt(v),
  'new-int?': (v) => v === undefined || v === null || isInt(v),
  'num?': (v) => v === null || isNum(v),
  str: (v) => typeof v === 'string',
  bool: (v) => typeof v === 'boolean',
  date: isDate,
  type: (v) => v === 'weight' || v === 'bodyweight' || v === 'cardio',
};

const fail = (message: string): never => {
  throw new InvalidBackupError(message);
};

/** Checks shape, types, unique ids and references; returns a copy with only the known fields. */
export function validateBackup(value: unknown): BackupFile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail('Not a backup object');
  const file = value as Record<string, unknown>;
  if (file.app !== 'gymapp') return fail('Not a GymApp backup');
  if (file.version !== BACKUP_VERSION) return fail(`Unsupported backup version: ${String(file.version)}`);
  if (typeof file.data !== 'object' || file.data === null) return fail('Backup has no data');

  const raw = file.data as Record<string, unknown>;
  const data = {} as Record<string, unknown[]>;
  for (const table of Object.keys(SPEC) as (keyof BackupData)[]) {
    const rows = raw[table];
    if (!Array.isArray(rows)) return fail(`Table "${table}" is missing`);
    const spec = SPEC[table];
    data[table] = rows.map((row, i) => {
      if (typeof row !== 'object' || row === null) return fail(`${table}[${i}] is not an object`);
      const out: Record<string, unknown> = {};
      for (const [field, kind] of Object.entries(spec)) {
        const v = (row as Record<string, unknown>)[field];
        if (!CHECKS[kind](v)) return fail(`${table}[${i}].${field} is invalid`);
        out[field] = v ?? null;
      }
      return out;
    });
  }

  const ids = (table: keyof BackupData, key = 'id') => {
    const seen = new Set<unknown>();
    for (const r of data[table] as Record<string, unknown>[]) {
      if (seen.has(r[key])) return fail(`Duplicate ${key} in "${table}"`);
      seen.add(r[key]);
    }
    return seen;
  };
  const groupIds = ids('muscleGroups');
  const exerciseIds = ids('exercises');
  const programIds = ids('programs');
  ids('programExercises');
  const workoutIds = ids('workouts');
  const workoutExerciseIds = ids('workoutExercises');
  ids('sets');
  ids('settings', 'key');

  const refs = (table: keyof BackupData, field: string, target: Set<unknown>, nullable = false) => {
    for (const r of data[table] as Record<string, unknown>[]) {
      if (nullable && r[field] === null) continue;
      if (!target.has(r[field])) return fail(`${table}.${field} points to a missing row`);
    }
  };
  refs('exercises', 'groupId', groupIds);
  refs('programExercises', 'programId', programIds);
  refs('programExercises', 'exerciseId', exerciseIds);
  refs('workouts', 'programId', programIds, true);
  refs('workoutExercises', 'workoutId', workoutIds);
  refs('workoutExercises', 'exerciseId', exerciseIds);
  refs('sets', 'workoutExerciseId', workoutExerciseIds);

  return {
    app: 'gymapp',
    version: BACKUP_VERSION,
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
    data: data as unknown as BackupData,
  };
}

export function parseBackup(text: string): BackupFile {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return fail('File is not valid JSON');
  }
  return validateBackup(value);
}

// ── import ──────────────────────────────────────────────────────────────────

const MAX_VARIABLES = 900; // stay well under SQLite's bound-parameter limit

function insertAll<T extends SQLiteTable>(tx: Pick<AnyDb, 'insert'>, table: T, rows: T['$inferInsert'][], columns: number) {
  const size = Math.max(1, Math.floor(MAX_VARIABLES / columns));
  for (let i = 0; i < rows.length; i += size) tx.insert(table).values(rows.slice(i, i + size)).run();
}

/**
 * Replaces all data with the backup, in one transaction: if anything fails, nothing changes.
 * Ids are kept, so every relation survives. Call `validateBackup` first.
 */
export function importBackup(db: AnyDb, backup: BackupFile) {
  const d = backup.data;
  db.transaction((tx) => {
    // children first, so foreign keys are never violated
    tx.delete(sets).run();
    tx.delete(workoutExercises).run();
    tx.delete(workouts).run();
    tx.delete(programExercises).run();
    tx.delete(programs).run();
    tx.delete(exercises).run();
    tx.delete(muscleGroups).run();
    tx.delete(settings).run();

    insertAll(tx, muscleGroups, d.muscleGroups, 4);
    insertAll(tx, exercises, d.exercises, 5);
    insertAll(tx, programs, d.programs, 4);
    insertAll(tx, programExercises, d.programExercises, 4);
    insertAll(tx, workouts, d.workouts, 7);
    insertAll(tx, workoutExercises, d.workoutExercises, 4);
    insertAll(tx, sets, d.sets, 8);
    insertAll(tx, settings, d.settings, 2);

    // A restored database is never "fresh": default groups must not be recreated on next launch.
    if (!d.settings.some((s) => s.key === 'seeded')) tx.insert(settings).values({ key: 'seeded', value: '1' }).run();
  });
}

// ── summary ─────────────────────────────────────────────────────────────────

export function backupSummary(b: BackupFile) {
  const { data } = b;
  return {
    workouts: data.workouts.length,
    exercises: data.exercises.filter((e) => !e.archived).length,
    programs: data.programs.length,
    sets: data.sets.filter((s) => s.reps !== null || s.durationSec !== null || s.distanceM !== null).length,
  };
}
