import { eq } from 'drizzle-orm';

import { groupsWithCounts, programExercisesOf, programsWithCounts } from '@/library/queries';

import { exercises } from '../schema';
import { queryTables } from '../query-tables';
import { createTestDb } from '../test-db';

const names = (q: Parameters<typeof queryTables>[0]) => queryTables(q).map((t) => t.name).sort();

describe('queryTables', () => {
  it('includes the main table and every joined table', async () => {
    const db = await createTestDb();
    expect(names(groupsWithCounts(db))).toEqual(['exercises', 'muscle_groups']);
    expect(names(programsWithCounts(db))).toEqual(['program_exercises', 'programs']);
    expect(names(programExercisesOf(db, 1))).toEqual(['exercises', 'program_exercises']);
  });

  it('returns just the one table for a plain select', async () => {
    const db = await createTestDb();
    expect(names(db.select().from(exercises).where(eq(exercises.id, 1)))).toEqual(['exercises']);
  });
});
