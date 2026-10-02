import { eq, max, sql } from 'drizzle-orm';

import { programExercises, programs, sets, workoutExercises, workouts } from '@/db/schema';
import type { AnyDb } from '@/db/types';
import type { ISODate } from '@/lib/dates';

import { filled } from './queries';

type Tx = Pick<AnyDb, 'select' | 'insert' | 'update' | 'delete'>;

/** Colour of a workout that has no program behind it. */
export const EMPTY_WORKOUT_COLOR = 'blue';

function workoutIdOn(tx: Tx, date: ISODate): number | undefined {
  return tx.select({ id: workouts.id }).from(workouts).where(eq(workouts.date, date)).orderBy(workouts.id).limit(1).get()?.id;
}

function appendExercises(tx: Tx, workoutId: number, exerciseIds: number[]) {
  if (exerciseIds.length === 0) return;
  const { top } = tx
    .select({ top: max(workoutExercises.position) })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .get()!;
  const created = tx
    .insert(workoutExercises)
    .values(exerciseIds.map((exerciseId, i) => ({ workoutId, exerciseId, position: (top ?? -1) + 1 + i })))
    .returning({ id: workoutExercises.id })
    .all();
  // Every exercise starts with one empty set, ready to type into.
  tx.insert(sets)
    .values(created.map((r) => ({ workoutExerciseId: r.id, position: 0 })))
    .run();
}

/**
 * One workout per day. The program's exercises are copied, so later edits to the program never
 * touch the workout. If the day already has a workout, the exercises are appended to it.
 */
export function addProgramToDate(db: AnyDb, date: ISODate, programId: number): number {
  return db.transaction((tx) => {
    const program = tx.select().from(programs).where(eq(programs.id, programId)).get();
    if (!program) throw new Error(`Program ${programId} not found`);
    const exerciseIds = tx
      .select({ id: programExercises.exerciseId })
      .from(programExercises)
      .where(eq(programExercises.programId, programId))
      .orderBy(programExercises.position)
      .all()
      .map((r) => r.id);

    const existing = workoutIdOn(tx, date);
    const workoutId =
      existing ??
      tx
        .insert(workouts)
        .values({ date, programId, name: program.name, color: program.color })
        .returning({ id: workouts.id })
        .get().id;
    appendExercises(tx, workoutId, exerciseIds);
    return workoutId;
  });
}

/** Adds an exercise to the day's workout, creating a program-less one on first use. */
export function addExerciseToDate(db: AnyDb, date: ISODate, exerciseId: number, emptyName: string): number {
  return db.transaction((tx) => {
    const workoutId =
      workoutIdOn(tx, date) ??
      tx
        .insert(workouts)
        .values({ date, name: emptyName.trim(), color: EMPTY_WORKOUT_COLOR })
        .returning({ id: workouts.id })
        .get().id;
    appendExercises(tx, workoutId, [exerciseId]);
    return workoutId;
  });
}

/**
 * Puts the exercises of an earlier workout on `date`, in the same order and under the same name
 * and colour. Sets start empty; last time's numbers show up as suggestions.
 */
export function repeatWorkout(db: AnyDb, sourceWorkoutId: number, date: ISODate): number {
  return db.transaction((tx) => {
    const source = tx.select().from(workouts).where(eq(workouts.id, sourceWorkoutId)).get();
    if (!source) throw new Error(`Workout ${sourceWorkoutId} not found`);
    const exerciseIds = tx
      .select({ id: workoutExercises.exerciseId })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, sourceWorkoutId))
      .orderBy(workoutExercises.position)
      .all()
      .map((r) => r.id);
    const workoutId =
      workoutIdOn(tx, date) ??
      tx
        .insert(workouts)
        .values({ date, programId: source.programId, name: source.name, color: source.color })
        .returning({ id: workouts.id })
        .get().id;
    appendExercises(tx, workoutId, exerciseIds);
    return workoutId;
  });
}

/** Cascades to the workout's exercises and sets. */
export function removeWorkout(db: AnyDb, workoutId: number) {
  db.delete(workouts).where(eq(workouts.id, workoutId)).run();
}

// ── sets ────────────────────────────────────────────────────────────────────

export type SetValues = {
  weightKg?: number | null;
  reps?: number | null;
  durationSec?: number | null;
  distanceM?: number | null;
};

export function addSet(db: AnyDb, workoutExerciseId: number): number {
  return db.transaction((tx) => {
    const { top } = tx
      .select({ top: max(sets.position) })
      .from(sets)
      .where(eq(sets.workoutExerciseId, workoutExerciseId))
      .get()!;
    return tx
      .insert(sets)
      .values({ workoutExerciseId, position: (top ?? -1) + 1 })
      .returning({ id: sets.id })
      .get().id;
  });
}

/**
 * The set keeps the moment it first got a result (`loggedAt`); editing it later does not move the
 * time, clearing it does.
 */
export function updateSet(db: AnyDb, setId: number, values: SetValues, now: number = Date.now()) {
  db.transaction((tx) => {
    tx.update(sets).set(values).where(eq(sets.id, setId)).run();
    tx.update(sets)
      .set({ loggedAt: sql`case when ${filled} then coalesce(${sets.loggedAt}, ${now}) else null end` })
      .where(eq(sets.id, setId))
      .run();
  });
}

export function deleteSet(db: AnyDb, setId: number) {
  db.delete(sets).where(eq(sets.id, setId)).run();
}

/** Cascades to the exercise's sets; the workout itself stays even if it becomes empty. */
export function removeWorkoutExercise(db: AnyDb, workoutExerciseId: number) {
  db.delete(workoutExercises).where(eq(workoutExercises.id, workoutExerciseId)).run();
}

// ── workout actions ─────────────────────────────────────────────────────────

export function renameWorkout(db: AnyDb, workoutId: number, name: string) {
  const trimmed = name.trim();
  if (trimmed === '') return;
  db.update(workouts).set({ name: trimmed }).where(eq(workouts.id, workoutId)).run();
}

/**
 * Moves a workout to another day and returns the id of the workout that ends up there. If that
 * day already has a workout, the exercises (with their sets) are appended to it and the moved
 * workout is removed, so a day never holds two.
 */
export function moveWorkout(db: AnyDb, workoutId: number, date: ISODate): number {
  return db.transaction((tx) => {
    const current = tx.select().from(workouts).where(eq(workouts.id, workoutId)).get();
    if (!current) throw new Error(`Workout ${workoutId} not found`);
    if (current.date === date) return workoutId;

    const targetId = workoutIdOn(tx, date);
    if (targetId === undefined) {
      tx.update(workouts).set({ date }).where(eq(workouts.id, workoutId)).run();
      return workoutId;
    }

    const { top } = tx
      .select({ top: max(workoutExercises.position) })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, targetId))
      .get()!;
    tx.update(workoutExercises)
      .set({ workoutId: targetId, position: sql`${workoutExercises.position} + ${(top ?? -1) + 1}` })
      .where(eq(workoutExercises.workoutId, workoutId))
      .run();
    tx.delete(workouts).where(eq(workouts.id, workoutId)).run();
    return targetId;
  });
}
