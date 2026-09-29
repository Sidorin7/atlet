import type { KeyboardTypeOptions } from 'react-native';

import type { ExerciseType, sets } from '@/db/schema';

import { kmToMeters, metersToKm, minutesToSeconds, secondsToMinutes } from './numbers';
import type { SetValues } from './repo';

export type SetRecord = typeof sets.$inferSelect;

/** One of the two numbers typed into a set. */
export type Field = {
  read: (s: SetRecord) => number | null;
  write: (n: number | null) => SetValues;
  unit: string;
  keyboard: KeyboardTypeOptions;
  signed?: boolean;
};

export type Units = { kg: string; load: string; reps: string; min: string; km: string };

export function fieldsFor(type: ExerciseType, u: Units): [Field, Field] {
  const reps: Field = {
    read: (s) => s.reps,
    write: (n) => ({ reps: n === null ? null : Math.round(n) }),
    unit: u.reps,
    keyboard: 'number-pad',
  };
  switch (type) {
    case 'cardio':
      return [
        {
          read: (s) => secondsToMinutes(s.durationSec),
          write: (n) => ({ durationSec: minutesToSeconds(n) }),
          unit: u.min,
          keyboard: 'decimal-pad',
        },
        {
          read: (s) => metersToKm(s.distanceM),
          write: (n) => ({ distanceM: kmToMeters(n) }),
          unit: u.km,
          keyboard: 'decimal-pad',
        },
      ];
    case 'bodyweight':
      return [
        {
          read: (s) => s.weightKg,
          write: (n) => ({ weightKg: n }),
          unit: u.load,
          keyboard: 'numbers-and-punctuation',
          signed: true,
        },
        reps,
      ];
    default:
      return [{ read: (s) => s.weightKg, write: (n) => ({ weightKg: n }), unit: u.kg, keyboard: 'decimal-pad' }, reps];
  }
}

/**
 * Grey suggestion for each set, field by field: what was typed in the set just above it today,
 * otherwise the same-numbered set from last time. So after the first set every next one offers
 * the same numbers until the user types something else.
 */
export function suggestions(fields: Field[], rows: SetRecord[], lastTime: SetRecord[]): (SetRecord | undefined)[] {
  return rows.map((row, i) => {
    const above = rows[i - 1];
    const before = lastTime[i];
    if (!above && !before) return undefined;
    const merged = { ...row, durationSec: null, distanceM: null, weightKg: null, reps: null };
    for (const f of fields) {
      const fromAbove = above ? f.read(above) : null;
      const value = fromAbove ?? (before ? f.read(before) : null);
      Object.assign(merged, f.write(value));
    }
    return fields.some((f) => f.read(merged) !== null) ? merged : undefined;
  });
}

/** Suggested values for the fields of `set` that are still empty; null if there is nothing to fill. */
export function ghostPatch(fields: Field[], set: SetRecord, ghost: SetRecord | undefined): SetValues | null {
  if (!ghost) return null;
  const patch: SetValues = {};
  for (const f of fields) {
    if (f.read(set) === null && f.read(ghost) !== null) Object.assign(patch, f.write(f.read(ghost)));
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
