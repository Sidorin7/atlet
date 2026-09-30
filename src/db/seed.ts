import { count, eq } from 'drizzle-orm';

import { resources } from '@/i18n';
import type { Language } from '@/settings/resolve';

import { exercises, muscleGroups, settings } from './schema';
import type { AnyDb } from './types';

const DEFAULT_GROUP_KEYS = [
  'stretch', 'cardio', 'chest', 'back', 'arms', 'legs', 'shoulders', 'abs',
] as const;

export function defaultGroups(lng: Language) {
  const names = resources[lng].translation.groups;
  return DEFAULT_GROUP_KEYS.map((key, position) => ({ name: names[key], icon: key, position }));
}

type GroupKey = (typeof DEFAULT_GROUP_KEYS)[number];

/** A starter set of common gym exercises, so a new user can log a workout straight away. */
const DEFAULT_EXERCISES: { group: GroupKey; ru: string; en: string }[] = [
  { group: 'legs', ru: 'Приседания со штангой', en: 'Barbell squat' },
  { group: 'legs', ru: 'Разгибание ног сидя', en: 'Seated leg extension' },
  { group: 'legs', ru: 'Сгибание ног лежа', en: 'Lying leg curl' },
  { group: 'chest', ru: 'Жим штанги лежа в смите', en: 'Smith machine bench press' },
  { group: 'chest', ru: 'Жим в смите под 30°', en: 'Smith machine incline press, 30°' },
  { group: 'chest', ru: 'Жим гантелей под 30°', en: 'Incline dumbbell press, 30°' },
  { group: 'back', ru: 'Тяга верхнего блока широким хватом', en: 'Wide-grip lat pulldown' },
  { group: 'back', ru: 'Тяга нижнего блока', en: 'Seated cable row' },
  { group: 'back', ru: 'Тяга гантели одной рукой', en: 'One-arm dumbbell row' },
  { group: 'back', ru: 'Тяга в хаммере', en: 'Hammer Strength row' },
  { group: 'shoulders', ru: 'Жим гантелей сидя', en: 'Seated dumbbell press' },
  { group: 'shoulders', ru: 'Задняя дельта в блоке одной рукой', en: 'One-arm cable rear delt fly' },
  { group: 'shoulders', ru: 'Махи с гантелями стоя', en: 'Standing dumbbell lateral raise' },
  { group: 'arms', ru: 'Сгибание гантели на наклонной скамье', en: 'Incline dumbbell curl' },
  { group: 'arms', ru: 'Сгибание штанги на скамье Скотта', en: 'Barbell preacher curl' },
  { group: 'arms', ru: 'Разгибание в блоке с широкой рукояткой', en: 'Wide-bar cable pushdown' },
  { group: 'arms', ru: 'Французский жим с гантелями', en: 'Dumbbell French press' },
];

export function defaultExercises(lng: Language, groupIds: Record<GroupKey, number>) {
  return DEFAULT_EXERCISES.map((e) => ({ name: e[lng], groupId: groupIds[e.group], type: 'weight' as const }));
}

const SEEDED_KEY = 'seeded';

/** Runs once per install: groups and exercises deleted later by the user are not recreated. */
export function seedDefaults(db: AnyDb, lng: Language) {
  db.transaction((tx) => {
    const seeded = tx.select().from(settings).where(eq(settings.key, SEEDED_KEY)).all();
    if (seeded.length > 0) return;
    const { n } = tx.select({ n: count() }).from(muscleGroups).get()!;
    if (n === 0) {
      const groups = tx
        .insert(muscleGroups)
        .values(defaultGroups(lng))
        .returning({ id: muscleGroups.id, icon: muscleGroups.icon })
        .all();
      const ids = Object.fromEntries(groups.map((g) => [g.icon, g.id])) as Record<GroupKey, number>;
      tx.insert(exercises).values(defaultExercises(lng, ids)).run();
    }
    tx.insert(settings).values({ key: SEEDED_KEY, value: '1' }).run();
  });
}
