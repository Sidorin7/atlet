import { reminderFor } from '../reminder';

const today = '2026-09-30'; // Wednesday

describe('reminderFor', () => {
  it('stays quiet before the third day off, and with no workouts at all', () => {
    expect(reminderFor(new Set(), today)).toBeNull();
    expect(reminderFor(new Set(['2026-09-28']), today)).toBeNull();
    expect(reminderFor(new Set(['2026-10-05']), today)).toBeNull();
  });

  it('counts the days since the last workout and picks the tier', () => {
    expect(reminderFor(new Set(['2026-09-27']), today)).toMatchObject({ days: 3, tier: 'short' });
    expect(reminderFor(new Set(['2026-09-23']), today)).toMatchObject({ days: 7, tier: 'week' });
    expect(reminderFor(new Set(['2026-09-01']), today)).toMatchObject({ days: 29, tier: 'long' });
  });

  it('warns about a streak only while this week has no workout yet', () => {
    const lastWeek = reminderFor(new Set(['2026-09-26', '2026-09-19']), today)!;
    expect(lastWeek.streak).toEqual({ weeks: 2, daysLeft: 5 });
    // Friday after a Monday workout: the break is mentioned, but this week already counts.
    const safe = reminderFor(new Set(['2026-09-28', '2026-09-21']), '2026-10-02')!;
    expect(safe.days).toBe(4);
    expect(safe.streak).toBeNull();
  });

  it('changes the motivation line from one day to the next', () => {
    const a = reminderFor(new Set(['2026-09-01']), today)!.phrase;
    const b = reminderFor(new Set(['2026-09-01']), '2026-10-01')!.phrase;
    expect(a).not.toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
  });
});
