// Test-only: real migrations applied to an in-memory sql.js database.
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';

import * as schema from './schema';
import type { AnyDb } from './types';

export async function createTestDb(): Promise<AnyDb> {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  sqlite.run('PRAGMA foreign_keys = ON;');
  const dir = join(__dirname, '../../drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    for (const stmt of readFileSync(join(dir, file), 'utf8').split('--> statement-breakpoint')) {
      if (stmt.trim()) sqlite.run(stmt);
    }
  }
  return drizzle(sqlite, { schema }) as unknown as AnyDb;
}
