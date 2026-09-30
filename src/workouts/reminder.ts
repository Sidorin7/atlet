import { diffDays, startOfWeek, weekdayIndex, type ISODate } from '@/lib/dates';
import { weekStreak } from '@/progress/aggregate';

/** The reminder shows once this many days have passed since the last workout. */
export const REMINDER_AFTER_DAYS = 3;
/** Motivation lines per tier in the translations (`reminder.short_0` … `short_2`). */
export const PHRASES = 3;

export type ReminderTier = 'short' | 'week' | 'long';

export type Reminder = {
  days: number;
  tier: ReminderTier;
  /** Which motivation line to show; changes once a day, not on every render. */
  phrase: number;
  /** A week streak that ends unless there is a workout before Sunday. */
  streak: { weeks: number; daysLeft: number } | null;
};

/** What to tell the user on today's empty screen after a break, or null when there is no break to mention. */
export function reminderFor(done: ReadonlySet<ISODate>, today: ISODate): Reminder | null {
  const last = [...done].filter((d) => d <= today).sort().pop();
  if (!last) return null;
  const days = diffDays(today, last);
  if (days < REMINDER_AFTER_DAYS) return null;

  const weeks = weekStreak(done, today);
  const trainedThisWeek = last >= startOfWeek(today);
  return {
    days,
    tier: days >= 14 ? 'long' : days >= 7 ? 'week' : 'short',
    phrase: diffDays(today, '2000-01-03') % PHRASES,
    streak: weeks > 0 && !trainedThisWeek ? { weeks, daysLeft: 7 - weekdayIndex(today) } : null,
  };
}
