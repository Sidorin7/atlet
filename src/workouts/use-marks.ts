import { useMemo } from 'react';

import type { Marks } from '@/components/calendar';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import type { ISODate } from '@/lib/dates';

import { workoutMarks } from './queries';

/** date → 'done' | 'planned' for every day that has a workout. */
export function useMarks(): Marks {
  const rows = useLive(() => workoutMarks(db));
  return useMemo(() => {
    const map = new Map<ISODate, 'done' | 'planned'>();
    for (const r of rows) if (r.done || !map.has(r.date)) map.set(r.date, r.done ? 'done' : 'planned');
    return map;
  }, [rows]);
}
