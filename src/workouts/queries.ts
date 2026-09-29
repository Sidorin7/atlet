import { and, asc, eq, isNotNull, lte, max, or, sql } from 'drizzle-orm';

import { exercises, muscleGroups, sets, workoutExercises, workouts } from '@/db/schema';
import type { Reader } from '@/db/types';
import { diffDays, type ISODate } from '@/lib/dates';

// A set counts as filled once it has reps, a duration or a distance (weight alone is not a result).
const filled = or(isNotNull(sets.reps), isNotNull(sets.durationSec), isNotNull(sets.distanceM))!;

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

export function daysSinceLastWorkout(db: Reader, today: ISODate): number | null {
  const last = lastDoneDate(db, today).all()[0]?.last;
  return last ? diffDays(today, last) : null;
}
