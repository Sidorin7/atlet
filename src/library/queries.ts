import { and, asc, count, eq } from 'drizzle-orm';

import { exercises, muscleGroups, programExercises, programs } from '@/db/schema';
import type { Reader } from '@/db/types';

// Builders are returned unexecuted so screens can wrap them in useLiveQuery and tests can call .all().

export const groupsWithCounts = (db: Reader) =>
  db
    .select({
      id: muscleGroups.id,
      name: muscleGroups.name,
      icon: muscleGroups.icon,
      position: muscleGroups.position,
      exerciseCount: count(exercises.id),
    })
    .from(muscleGroups)
    .leftJoin(exercises, and(eq(exercises.groupId, muscleGroups.id), eq(exercises.archived, false)))
    .groupBy(muscleGroups.id)
    .orderBy(asc(muscleGroups.position));

export const exercisesInGroup = (db: Reader, groupId: number) =>
  db
    .select()
    .from(exercises)
    .where(and(eq(exercises.groupId, groupId), eq(exercises.archived, false)))
    .orderBy(asc(exercises.name));

/** Every non-archived exercise with its group, for search across all groups. */
export const allExercises = (db: Reader) =>
  db
    .select({
      id: exercises.id,
      name: exercises.name,
      type: exercises.type,
      groupId: exercises.groupId,
      groupName: muscleGroups.name,
      groupIcon: muscleGroups.icon,
    })
    .from(exercises)
    .innerJoin(muscleGroups, eq(muscleGroups.id, exercises.groupId))
    .where(eq(exercises.archived, false))
    .orderBy(asc(exercises.name));

export const programsWithCounts = (db: Reader) =>
  db
    .select({
      id: programs.id,
      name: programs.name,
      color: programs.color,
      exerciseCount: count(programExercises.id),
    })
    .from(programs)
    .leftJoin(programExercises, eq(programExercises.programId, programs.id))
    .groupBy(programs.id)
    .orderBy(asc(programs.id));

export const programExercisesOf = (db: Reader, programId: number) =>
  db
    .select({
      id: programExercises.id,
      exerciseId: exercises.id,
      name: exercises.name,
      type: exercises.type,
      groupId: exercises.groupId,
    })
    .from(programExercises)
    .innerJoin(exercises, eq(exercises.id, programExercises.exerciseId))
    .where(eq(programExercises.programId, programId))
    .orderBy(asc(programExercises.position));

export const programById = (db: Reader, id: number) =>
  db.select().from(programs).where(eq(programs.id, id));

export const groupById = (db: Reader, id: number) =>
  db.select().from(muscleGroups).where(eq(muscleGroups.id, id));

export const exerciseById = (db: Reader, id: number) =>
  db.select().from(exercises).where(eq(exercises.id, id));
