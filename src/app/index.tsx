import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthGrid, WeekStrip } from '@/components/calendar';
import { EmptyIllustration } from '@/components/empty-illustration';
import { ChevronRightIcon, GearIcon, MoreIcon, PlusIcon, StatsIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { WorkoutView } from '@/components/workout-view';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { addMonths, diffDays, isSameMonth, monthTitle, startOfMonth, type ISODate } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import { useSettings } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';
import { showWorkoutMenu } from '@/workouts/menu';
import { lastDoneDate, workoutOnDate } from '@/workouts/queries';
import { removeWorkout, renameWorkout } from '@/workouts/repo';
import { useMarks } from '@/workouts/use-marks';

export default function DayScreen() {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const today = useToday();
  const [selected, setSelected] = useState<ISODate>(today);
  const [monthOpen, setMonthOpen] = useState(false);
  const [month, setMonth] = useState(startOfMonth(today));

  const marks = useMarks();

  const [workout] = useLive(() => workoutOnDate(db, selected), [selected]);
  const [{ last }] = useLive(() => lastDoneDate(db, today), [today]);

  // After "move workout" the sheet sends us to the new day (`at` makes repeated moves to one date register).
  const { date: requested, at } = useLocalSearchParams<{ date?: string; at?: string }>();
  useEffect(() => {
    if (requested) select(requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested, at]);

  const select = (date: ISODate) => {
    setSelected(date);
    setMonth(startOfMonth(date));
  };

  const toggleMonth = (open: boolean) => {
    if (open === monthOpen) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMonthOpen(open);
    if (open) setMonth(startOfMonth(selected));
  };

  const handleGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationY > 16) toggleMonth(true);
      else if (e.translationY < -16) toggleMonth(false);
    });

  // In month view "today" also means the current month is on screen.
  const onToday = selected === today && (!monthOpen || isSameMonth(month, today));

  const openLibrary = (tab?: 'programs') =>
    router.push({ pathname: '/library', params: { date: selected, ...(tab && { tab }) } });

  const title = monthOpen
    ? monthTitle(month, language, month.slice(0, 4) !== today.slice(0, 4))
    : selected === today
      ? t('common.today')
      : monthTitle(selected, language, selected.slice(0, 4) !== today.slice(0, 4));

  const emptyText = (() => {
    if (selected > today) return t('day.nothingPlanned');
    if (selected < today) return t('day.noWorkoutThatDay');
    if (last) {
      const days = diffDays(today, last);
      return days > 0 ? t('day.noWorkoutsFor', { count: days }) : t('day.noWorkouts');
    }
    return t('day.noWorkouts');
  })();

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {monthOpen && (
            <Pressable hitSlop={10} onPress={() => setMonth(addMonths(month, -1))} style={styles.flip}>
              <ChevronRightIcon color={colors.text} size={22} />
            </Pressable>
          )}
          <Pressable
            onPress={() => toggleMonth(!monthOpen)}
            accessibilityRole="button"
            accessibilityState={{ expanded: monthOpen }}
          >
            <Text style={[typography.largeTitle, { color: colors.text }]}>{title}</Text>
          </Pressable>
          {monthOpen && (
            <Pressable hitSlop={10} onPress={() => setMonth(addMonths(month, 1))}>
              <ChevronRightIcon color={colors.text} size={22} />
            </Pressable>
          )}
        </View>
        <View style={styles.headerButtons}>
          {!onToday && (
            <Pressable
              onPress={() => select(today)}
              hitSlop={8}
              accessibilityRole="button"
              style={[styles.todayButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[typography.caption, { color: colors.text }]}>{t('common.today')}</Text>
            </Pressable>
          )}
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('progress.title')}
            onPress={() => router.push('/progress')}
          >
            <StatsIcon color={colors.text} />
          </Pressable>
          <Link href="/settings" asChild>
            <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={t('settings.title')}>
              <GearIcon color={colors.text} />
            </Pressable>
          </Link>
        </View>
      </View>

      {monthOpen ? (
        <MonthGrid
          month={month}
          selected={selected}
          today={today}
          marks={marks}
          locale={language}
          onSelect={select}
        />
      ) : (
        <WeekStrip
          selected={selected}
          today={today}
          marks={marks}
          locale={language}
          onSelect={select}
        />
      )}

      <GestureDetector gesture={handleGesture}>
        <Pressable
          onPress={() => toggleMonth(!monthOpen)}
          hitSlop={{ top: 8, bottom: 12, left: 60, right: 60 }}
          accessibilityRole="button"
          style={styles.handleArea}
        >
          <View style={[styles.handle, { backgroundColor: colors.placeholder }]} />
        </Pressable>
      </GestureDetector>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        {workout ? (
          <WorkoutView key={workout.id} workout={workout} />
        ) : (
          <View style={styles.empty}>
            <EmptyIllustration disc={colors.surface} ink={colors.text} spark={colors.placeholder} />
            <Text style={[typography.title, { color: colors.text }]}>{emptyText}</Text>
            <View style={styles.emptyActions}>
              <Button title={t('day.pickProgram')} onPress={() => openLibrary('programs')} />
              <Button title={t('day.pickExercises')} variant="secondary" onPress={() => openLibrary()} />
            </View>
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => openLibrary()}
        accessibilityRole="button"
        accessibilityLabel={t('library.title')}
        style={[styles.fab, { backgroundColor: colors.accent }]}
      >
        <PlusIcon size={28} color={colors.onAccent} />
      </Pressable>
      {workout && (
        <Pressable
          onPress={() =>
            showWorkoutMenu(t, workout.name, {
              onMove: () =>
                router.push({
                  pathname: '/move-workout',
                  params: { workoutId: String(workout.id), date: workout.date },
                }),
              onRename: (name) => renameWorkout(db, workout.id, name),
              onDelete: () => removeWorkout(db, workout.id),
            })
          }
          accessibilityRole="button"
          accessibilityLabel={t('workout.actions')}
          style={[styles.more, { backgroundColor: colors.surface }]}
        >
          <MoreIcon size={24} color={colors.text} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flip: { transform: [{ scaleX: -1 }] },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  handleArea: { alignItems: 'center', paddingVertical: spacing.sm },
  handle: { width: 40, height: 5, borderRadius: radius.full },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 120, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  emptyActions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
  todayButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  more: {
    position: 'absolute',
    bottom: spacing.xl + 8,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
