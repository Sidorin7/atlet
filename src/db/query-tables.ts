import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { is } from 'drizzle-orm';

type SelectBuilder = { config: { table: unknown; joins?: { table: unknown }[] } };

/**
 * Tables a select reads from, main and joined. drizzle's own useLiveQuery only watches the
 * main table, so joined counts/names would go stale. `config` is the builder's internal state,
 * which drizzle's own live-query hook reads the same way.
 */
export function queryTables(query: unknown): { name: string; table: SQLiteTable }[] {
  const { config } = query as SelectBuilder;
  return [config.table, ...(config.joins ?? []).map((j) => j.table)]
    .filter((t): t is SQLiteTable => is(t, SQLiteTable))
    .map((table) => ({ name: getTableConfig(table).name, table }));
}
