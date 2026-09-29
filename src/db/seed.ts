import { count, eq } from 'drizzle-orm';

import { resources } from '@/i18n';
import type { Language } from '@/settings/resolve';

import type { Db } from './client';
import { muscleGroups, settings } from './schema';

const DEFAULT_GROUP_KEYS = [
  'stretch', 'cardio', 'chest', 'back', 'arms', 'legs', 'shoulders', 'abs',
] as const;

export function defaultGroups(lng: Language) {
  const names = resources[lng].translation.groups;
  return DEFAULT_GROUP_KEYS.map((key, position) => ({ name: names[key], icon: key, position }));
}

const SEEDED_KEY = 'seeded';

/** Runs once per install: groups deleted later by the user are not recreated. */
export async function seedDefaults(db: Db, lng: Language) {
  const seeded = await db.select().from(settings).where(eq(settings.key, SEEDED_KEY));
  if (seeded.length > 0) return;
  await db.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: count() }).from(muscleGroups);
    if (n === 0) await tx.insert(muscleGroups).values(defaultGroups(lng));
    await tx.insert(settings).values({ key: SEEDED_KEY, value: '1' });
  });
}
