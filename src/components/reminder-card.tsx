import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { shortDayLabel, type ISODate } from '@/lib/dates';
import { useSettings } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';
import type { Reminder } from '@/workouts/reminder';

/** Today's empty screen after a break: how long it has been, a line of motivation, a streak at risk. */
export function ReminderCard({
  reminder,
  last,
  today,
}: {
  reminder: Reminder;
  last: { name: string; date: ISODate };
  today: ISODate;
}) {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const { days, tier, phrase, streak } = reminder;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[typography.largeTitle, styles.days, { color: colors.text }]}>
        {t('reminder.daysOff', { count: days })}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {t('reminder.last', { name: last.name, date: shortDayLabel(last.date, language, today) })}
      </Text>
      <Text style={[typography.body, styles.phrase, { color: colors.text }]}>
        {t(`reminder.${tier}_${phrase}` as 'reminder.short_0')}
      </Text>
      {streak && (
        <View style={[styles.streak, { backgroundColor: colors.accent }]}>
          <Text style={[typography.caption, { color: colors.onAccent }]}>
            {t('reminder.streak', { count: streak.weeks })} · {t('reminder.daysLeft', { count: streak.daysLeft })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  days: { fontSize: 30 },
  phrase: { marginTop: spacing.sm, fontWeight: '500' },
  streak: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
