import { eq, max } from 'drizzle-orm';

import { programExercises, programs, workoutExercises, workouts } from '@/db/schema';
import type { AnyDb } from '@/db/types';
import type { ISODate } from '@/lib/dates';

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
  tx.insert(workoutExercises)
    .values(exerciseIds.map((exerciseId, i) => ({ workoutId, exerciseId, position: (top ?? -1) + 1 + i })))
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

/** Cascades to the workout's exercises and sets. */
export function removeWorkout(db: AnyDb, workoutId: number) {
  db.delete(workouts).where(eq(workouts.id, workoutId)).run();
}
