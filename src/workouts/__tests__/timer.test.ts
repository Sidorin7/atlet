import { IDLE_LIMIT_MS, workoutClock } from '../timer';

const MIN = 60_000;
const t0 = Date.UTC(2026, 9, 2, 10, 0);

describe('workoutClock', () => {
  it('shows nothing before the first set', () => {
    expect(workoutClock(undefined, true, t0)).toBeNull();
    expect(workoutClock({ first: null, last: null, empty: 3 }, true, t0)).toBeNull();
  });

  it('counts up to now while sets are left to do', () => {
    expect(workoutClock({ first: t0, last: t0 + 5 * MIN, empty: 2 }, true, t0 + 12.5 * MIN)).toEqual({
      minutes: 12,
      running: true,
    });
  });

  it('stops at the last set once every set is filled', () => {
    expect(workoutClock({ first: t0, last: t0 + 47 * MIN, empty: 0 }, true, t0 + 90 * MIN)).toEqual({
      minutes: 47,
      running: false,
    });
  });

  it('stops at the last set after a long pause, even with empty sets left', () => {
    const last = t0 + 40 * MIN;
    expect(workoutClock({ first: t0, last, empty: 1 }, true, last + IDLE_LIMIT_MS)).toEqual({
      minutes: 40,
      running: false,
    });
  });

  it('never runs on another day', () => {
    expect(workoutClock({ first: t0, last: t0 + 30 * MIN, empty: 4 }, false, t0 + 31 * MIN)).toEqual({
      minutes: 30,
      running: false,
    });
  });
});
