import { count, eq } from 'drizzle-orm';

import { resources } from '@/i18n';
import type { Language } from '@/settings/resolve';

import { muscleGroups, settings } from './schema';
import type { AnyDb } from './types';

const DEFAULT_GROUP_KEYS = [
  'stretch', 'cardio', 'chest', 'back', 'arms', 'legs', 'shoulders', 'abs',
] as const;

export function defaultGroups(lng: Language) {
  const names = resources[lng].translation.groups;
  return DEFAULT_GROUP_KEYS.map((key, position) => ({ name: names[key], icon: key, position }));
}

const SEEDED_KEY = 'seeded';

/** Runs once per install: groups deleted later by the user are not recreated. */
export function seedDefaults(db: AnyDb, lng: Language) {
  db.transaction((tx) => {
    const seeded = tx.select().from(settings).where(eq(settings.key, SEEDED_KEY)).all();
    if (seeded.length > 0) return;
    const { n } = tx.select({ n: count() }).from(muscleGroups).get()!;
    if (n === 0) tx.insert(muscleGroups).values(defaultGroups(lng)).run();
    tx.insert(settings).values({ key: SEEDED_KEY, value: '1' }).run();
  });
}
