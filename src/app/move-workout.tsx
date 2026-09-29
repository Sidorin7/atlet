import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MonthGrid } from '@/components/calendar';
import { ChevronRightIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { db } from '@/db/client';
import { addMonths, monthTitle, startOfMonth, type ISODate } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import { useSettings } from '@/settings/provider';
import { spacing, typography } from '@/theme/tokens';
import { moveWorkout } from '@/workouts/repo';
import { useMarks } from '@/workouts/use-marks';

export default function MoveWorkoutScreen() {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const { workoutId, date } = useLocalSearchParams<{ workoutId: string; date: ISODate }>();
  const today = useToday();
  const marks = useMarks();
  const [target, setTarget] = useState<ISODate>(date);
  const [month, setMonth] = useState(startOfMonth(date));

  const merges = target !== date && marks.has(target);

  const confirm = () => {
    const id = moveWorkout(db, Number(workoutId), target);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissTo({ pathname: '/', params: { date: target, at: String(Date.now()) } });
    return id;
  };

  return (
    <View style={styles.container}>
      <Text style={[typography.title, { color: colors.text }]}>{t('workout.moveTitle')}</Text>
      <View style={styles.monthRow}>
        <Pressable hitSlop={10} onPress={() => setMonth(addMonths(month, -1))} style={styles.flip}>
          <ChevronRightIcon color={colors.text} size={22} />
        </Pressable>
        <Text style={[typography.body, { color: colors.text }]}>
          {monthTitle(month, language, true)}
        </Text>
        <Pressable hitSlop={10} onPress={() => setMonth(addMonths(month, 1))}>
          <ChevronRightIcon color={colors.text} size={22} />
        </Pressable>
      </View>
      <MonthGrid
        month={month}
        selected={target}
        today={today}
        marks={marks}
        locale={language}
        onSelect={setTarget}
      />
      {merges && (
        <Text style={[typography.caption, styles.note, { color: colors.textSecondary }]}>
          {t('workout.willMerge')}
        </Text>
      )}
      <View style={styles.spacer} />
      <Button title={t('workout.moveHere')} onPress={confirm} disabled={target === date} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flip: { transform: [{ scaleX: -1 }] },
  note: { textAlign: 'center' },
  spacer: { flex: 1 },
});
