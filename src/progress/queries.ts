import { asc, eq } from 'drizzle-orm';

import { exercises, muscleGroups, sets, workoutExercises, workouts } from '@/db/schema';
import type { Reader } from '@/db/types';
import { filled } from '@/workouts/queries';

/** Every filled set with its exercise, group and day, oldest first: the input of all progress views. */
export const progressRows = (db: Reader) =>
  db
    .select({
      id: sets.id,
      date: workouts.date,
      exerciseId: exercises.id,
      name: exercises.name,
      groupIcon: muscleGroups.icon,
      type: exercises.type,
      weightKg: sets.weightKg,
      reps: sets.reps,
      durationSec: sets.durationSec,
      distanceM: sets.distanceM,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .innerJoin(muscleGroups, eq(muscleGroups.id, exercises.groupId))
    .where(filled)
    .orderBy(asc(workouts.date), asc(workoutExercises.position), asc(sets.position), asc(sets.id));
