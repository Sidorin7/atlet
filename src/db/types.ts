import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/** Common shape of the app's expo-sqlite db and the sql.js db used in tests (both sync). */
export type AnyDb = BaseSQLiteDatabase<'sync', any, typeof schema>;
