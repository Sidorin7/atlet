import { and, asc, desc, eq, isNotNull, lt, lte, max, min, or, sql } from 'drizzle-orm';

import { exercises, muscleGroups, sets, workoutExercises, workouts } from '@/db/schema';
import type { Reader } from '@/db/types';
import { diffDays, type ISODate } from '@/lib/dates';

// A set counts as filled once it has reps, a duration or a distance (weight alone is not a result).
export const filled = or(isNotNull(sets.reps), isNotNull(sets.durationSec), isNotNull(sets.distanceM))!;

export const workoutOnDate = (db: Reader, date: ISODate) =>
  db.select().from(workouts).where(eq(workouts.date, date)).orderBy(asc(workouts.id)).limit(1);

export const workoutExercisesOf = (db: Reader, workoutId: number) =>
  db
    .select({
      id: workoutExercises.id,
      exerciseId: exercises.id,
      name: exercises.name,
      type: exercises.type,
      groupIcon: muscleGroups.icon,
      position: workoutExercises.position,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .innerJoin(muscleGroups, eq(muscleGroups.id, exercises.groupId))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.position), asc(workoutExercises.id));

/** One row per workout: `done` is 1 once it has at least one filled set, otherwise 0 (planned). */
export const workoutMarks = (db: Reader) =>
  db
    .select({
      date: workouts.date,
      done: sql<number>`max(case when ${filled} then 1 else 0 end)`,
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .leftJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .groupBy(workouts.id)
    .orderBy(asc(workouts.date));

export const lastDoneDate = (db: Reader, today: ISODate) =>
  db
    .select({ last: max(workouts.date) })
    .from(workouts)
    .innerJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(and(lte(workouts.date, today), filled));

/** The latest workout on or before `today` that has a filled set. */
export const lastDoneWorkout = (db: Reader, today: ISODate) =>
  db
    .select({ id: workouts.id, date: workouts.date, name: workouts.name })
    .from(workouts)
    .innerJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(and(lte(workouts.date, today), filled))
    .orderBy(desc(workouts.date), desc(workouts.id))
    .limit(1);

/** Every day that has a workout with a filled set. */
export const doneDates = (db: Reader) =>
  db
    .select({ date: workouts.date })
    .from(workouts)
    .innerJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(filled)
    .groupBy(workouts.date);

/** How many workouts have at least one filled set, and the date of the first of them. */
export const doneWorkoutStats = (db: Reader) =>
  db
    .select({ count: sql<number>`count(distinct ${workouts.id})`, first: min(workouts.date) })
    .from(workouts)
    .innerJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(filled);

export function daysSinceLastWorkout(db: Reader, today: ISODate): number | null {
  const last = lastDoneDate(db, today).all()[0]?.last;
  return last ? diffDays(today, last) : null;
}

export const setsOf = (db: Reader, workoutExerciseId: number) =>
  db
    .select()
    .from(sets)
    .where(eq(sets.workoutExerciseId, workoutExerciseId))
    .orderBy(asc(sets.position), asc(sets.id));

/** Filled sets per exercise of a workout (exercises without any are absent or 0). */
export const workoutSetSummary = (db: Reader, workoutId: number) =>
  db
    .select({
      workoutExerciseId: workoutExercises.id,
      filled: sql<number>`coalesce(sum(case when ${filled} then 1 else 0 end), 0)`,
    })
    .from(workoutExercises)
    .leftJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .groupBy(workoutExercises.id);

/**
 * "Last time": the date and filled sets of this exercise in the latest workout before `beforeDate`
 * that has any. Empty rows are left out so ghost values line up with real sets.
 */
export function previousSession(db: Reader, exerciseId: number, beforeDate: ISODate) {
  const hasFilled = sql`exists (select 1 from ${sets} where ${sets.workoutExerciseId} = ${workoutExercises.id} and (${sets.reps} is not null or ${sets.durationSec} is not null or ${sets.distanceM} is not null))`;
  const last = db
    .select({ id: workoutExercises.id, date: workouts.date })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(workoutExercises.exerciseId, exerciseId), lt(workouts.date, beforeDate), hasFilled))
    .orderBy(desc(workouts.date), asc(workoutExercises.position))
    .limit(1)
    .all()[0];
  if (!last) return { date: null, sets: [] };
  const rows = db
    .select()
    .from(sets)
    .where(and(eq(sets.workoutExerciseId, last.id), filled))
    .orderBy(asc(sets.position), asc(sets.id))
    .all();
  return { date: last.date, sets: rows };
}
