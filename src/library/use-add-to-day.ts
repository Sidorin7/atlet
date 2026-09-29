import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { db } from '@/db/client';
import { addExerciseToDate } from '@/workouts/repo';

/** Tapping an exercise in the library adds it to the day's workout; `counts` shows what was added here. */
export function useAddToDay(date: string | undefined) {
  const { t } = useTranslation();
  const [counts, setCounts] = useState<ReadonlyMap<number, number>>(new Map());

  const add = (exerciseId: number): boolean => {
    if (!date) return false;
    addExerciseToDate(db, date, exerciseId, t('day.defaultWorkout'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCounts((prev) => new Map(prev).set(exerciseId, (prev.get(exerciseId) ?? 0) + 1));
    return true;
  };

  return { counts, add };
}
