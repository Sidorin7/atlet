import { eq, max } from 'drizzle-orm';

import {
  exercises,
  muscleGroups,
  programExercises,
  programs,
  workoutExercises,
  type ExerciseType,
} from '@/db/schema';
import type { AnyDb } from '@/db/types';

// The expo-sqlite driver is synchronous: transactions must use sync callbacks (.all/.get/.run),
// otherwise the commit runs before the awaited queries do.

export class GroupNotEmptyError extends Error {
  constructor() {
    super('Group still has exercises');
    this.name = 'GroupNotEmptyError';
    Object.setPrototypeOf(this, GroupNotEmptyError.prototype); // keep instanceof working after transpilation
  }
}

// ── groups ──────────────────────────────────────────────────────────────────

export function createGroup(db: AnyDb, input: { name: string; icon: string }): number {
  return db.transaction((tx) => {
    const { top } = tx.select({ top: max(muscleGroups.position) }).from(muscleGroups).get()!;
    return tx
      .insert(muscleGroups)
      .values({ name: input.name.trim(), icon: input.icon, position: (top ?? -1) + 1 })
      .returning({ id: muscleGroups.id })
      .get().id;
  });
}

export function updateGroup(db: AnyDb, id: number, input: { name?: string; icon?: string }) {
  const set = { ...input, ...(input.name !== undefined && { name: input.name.trim() }) };
  db.update(muscleGroups).set(set).where(eq(muscleGroups.id, id)).run();
}

/** Blocked while any exercise (archived ones included: history still points at them) uses the group. */
export function deleteGroup(db: AnyDb, id: number) {
  db.transaction((tx) => {
    const used = tx.select({ id: exercises.id }).from(exercises).where(eq(exercises.groupId, id)).limit(1).all();
    if (used.length > 0) throw new GroupNotEmptyError();
    tx.delete(muscleGroups).where(eq(muscleGroups.id, id)).run();
  });
}

// ── exercises ───────────────────────────────────────────────────────────────

export function createExercise(
  db: AnyDb,
  input: { name: string; groupId: number; type: ExerciseType },
): number {
  return db
    .insert(exercises)
    .values({ name: input.name.trim(), groupId: input.groupId, type: input.type })
    .returning({ id: exercises.id })
    .get().id;
}

export function updateExercise(
  db: AnyDb,
  id: number,
  input: { name?: string; groupId?: number; type?: ExerciseType },
) {
  const set = { ...input, ...(input.name !== undefined && { name: input.name.trim() }) };
  db.update(exercises).set(set).where(eq(exercises.id, id)).run();
}

export function hasHistory(db: Pick<AnyDb, 'select'>, exerciseId: number): boolean {
  return (
    db.select({ id: workoutExercises.id }).from(workoutExercises).where(eq(workoutExercises.exerciseId, exerciseId)).limit(1).all()
      .length > 0
  );
}

/** Exercises with history are archived (hidden), the rest are deleted. Either way they leave all programs. */
export function removeExercise(db: AnyDb, id: number) {
  db.transaction((tx) => {
    const archive = hasHistory(tx, id);
    tx.delete(programExercises).where(eq(programExercises.exerciseId, id)).run();
    if (archive) tx.update(exercises).set({ archived: true }).where(eq(exercises.id, id)).run();
    else tx.delete(exercises).where(eq(exercises.id, id)).run();
  });
}

// ── programs ────────────────────────────────────────────────────────────────

type ProgramInput = { name: string; color: string; exerciseIds: number[] };

function insertItems(tx: Pick<AnyDb, 'insert'>, programId: number, exerciseIds: number[]) {
  if (exerciseIds.length === 0) return;
  tx.insert(programExercises)
    .values(exerciseIds.map((exerciseId, position) => ({ programId, exerciseId, position })))
    .run();
}

export function createProgram(db: AnyDb, input: ProgramInput): number {
  return db.transaction((tx) => {
    const { id } = tx
      .insert(programs)
      .values({ name: input.name.trim(), color: input.color })
      .returning({ id: programs.id })
      .get();
    insertItems(tx, id, input.exerciseIds);
    return id;
  });
}

export function updateProgram(db: AnyDb, id: number, input: ProgramInput) {
  db.transaction((tx) => {
    tx.update(programs).set({ name: input.name.trim(), color: input.color }).where(eq(programs.id, id)).run();
    tx.delete(programExercises).where(eq(programExercises.programId, id)).run();
    insertItems(tx, id, input.exerciseIds);
  });
}

/** Workouts created from the program keep existing (their program_id becomes NULL). */
export function deleteProgram(db: AnyDb, id: number) {
  db.delete(programs).where(eq(programs.id, id)).run();
}
