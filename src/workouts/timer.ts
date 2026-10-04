/**
 * A gap this long between two logged sets is a break, not training: it is left out of the workout
 * time, and with nothing logged for this long the workout counts as over even if some sets stay empty.
 */
export const IDLE_LIMIT_MS = 30 * 60_000;

/** `times`: when each set was logged, ascending; `empty`: how many sets have no result yet. */
export type Timing = { times: number[]; empty: number };

export function toTiming(rows: { loggedAt: number | null; filled: number | boolean }[]): Timing {
  return {
    times: rows.flatMap((r) => (r.loggedAt === null ? [] : [r.loggedAt])).sort((a, b) => a - b),
    empty: rows.filter((r) => !r.filled).length,
  };
}

/**
 * Workout duration: the time between consecutive logged sets, leaving out breaks of `IDLE_LIMIT_MS`
 * or more — so a set added long after the workout does not stretch it. While the workout is on
 * today, still has empty sets and the latest set came on time and is fresh, it keeps counting to `now`.
 */
export function workoutClock(timing: Timing | undefined, isToday: boolean, now: number) {
  const times = timing?.times ?? [];
  if (times.length === 0) return null;
  let active = 0;
  for (let i = 1; i < times.length; i++) {
    const gap = times[i] - times[i - 1];
    if (gap < IDLE_LIMIT_MS) active += gap;
  }
  const last = times[times.length - 1];
  // A lone set after a break does not restart the clock; the next one does.
  const resumed = times.length === 1 || last - times[times.length - 2] < IDLE_LIMIT_MS;
  const running = isToday && timing!.empty > 0 && resumed && now - last < IDLE_LIMIT_MS;
  if (running) active += Math.max(0, now - last);
  return { minutes: Math.floor(active / 60_000), running };
}
