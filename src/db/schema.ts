import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const muscleGroups = sqliteTable('muscle_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  position: integer('position').notNull(),
});

export type ExerciseType = 'weight' | 'bodyweight' | 'cardio';

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  groupId: integer('group_id')
    .notNull()
    .references(() => muscleGroups.id),
  type: text('type').$type<ExerciseType>().notNull(),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
});

const createdAt = () =>
  text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`);

export const programs = sqliteTable('programs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  createdAt: createdAt(),
});

export const programExercises = sqliteTable('program_exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  programId: integer('program_id')
    .notNull()
    .references(() => programs.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id),
  position: integer('position').notNull(),
});

export const workouts = sqliteTable('workouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** 'YYYY-MM-DD' */
  date: text('date').notNull(),
  programId: integer('program_id').references(() => programs.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  createdAt: createdAt(),
});

export const workoutExercises = sqliteTable('workout_exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workoutId: integer('workout_id')
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id),
  position: integer('position').notNull(),
});

export const sets = sqliteTable('sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workoutExerciseId: integer('workout_exercise_id')
    .notNull()
    .references(() => workoutExercises.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  /** For bodyweight: signed added load (+10 belt, −20 assisted). */
  weightKg: real('weight_kg'),
  reps: integer('reps'),
  durationSec: integer('duration_sec'),
  distanceM: real('distance_m'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
