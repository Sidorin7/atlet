import { IDLE_LIMIT_MS, toTiming, workoutClock } from '../timer';

const MIN = 60_000;
const t0 = Date.UTC(2026, 9, 2, 10, 0);
const at = (...minutes: number[]) => minutes.map((m) => t0 + m * MIN);

describe('workoutClock', () => {
  it('shows nothing before the first set', () => {
    expect(workoutClock(undefined, true, t0)).toBeNull();
    expect(workoutClock({ times: [], empty: 3 }, true, t0)).toBeNull();
  });

  it('counts up to now while sets are left to do', () => {
    expect(workoutClock({ times: at(0, 5), empty: 2 }, true, t0 + 12.5 * MIN)).toEqual({
      minutes: 12,
      running: true,
    });
  });

  it('stops at the last set once every set is filled', () => {
    expect(workoutClock({ times: at(0, 20, 47), empty: 0 }, true, t0 + 90 * MIN)).toEqual({
      minutes: 47,
      running: false,
    });
  });

  it('stops at the last set after a long pause, even with empty sets left', () => {
    const now = t0 + 40 * MIN + IDLE_LIMIT_MS;
    expect(workoutClock({ times: at(0, 20, 40), empty: 1 }, true, now)).toEqual({ minutes: 40, running: false });
  });

  it('never runs on another day', () => {
    expect(workoutClock({ times: at(0, 25), empty: 4 }, false, t0 + 26 * MIN)).toEqual({
      minutes: 25,
      running: false,
    });
  });

  it('does not stretch the workout with a set logged long after it', () => {
    const late = { times: at(0, 20, 45, 165), empty: 1 };
    expect(workoutClock(late, true, t0 + 166 * MIN)).toEqual({ minutes: 45, running: false });
  });

  it('leaves out a long break but counts the sets after it', () => {
    expect(workoutClock({ times: at(0, 10, 50, 55, 60), empty: 0 }, true, t0 + 61 * MIN)).toEqual({
      minutes: 20,
      running: false,
    });
  });

  it('treats a gap of exactly the idle limit as a break', () => {
    expect(workoutClock({ times: [t0, t0 + IDLE_LIMIT_MS], empty: 0 }, true, t0)).toEqual({
      minutes: 0,
      running: false,
    });
  });
});

describe('toTiming', () => {
  it('keeps the logged times in order and counts unfilled sets', () => {
    expect(
      toTiming([
        { loggedAt: null, filled: 0 },
        { loggedAt: 5000, filled: 1 },
        { loggedAt: null, filled: 1 }, // filled before set times were recorded
        { loggedAt: 1000, filled: 1 },
      ]),
    ).toEqual({ times: [1000, 5000], empty: 1 });
  });
});
