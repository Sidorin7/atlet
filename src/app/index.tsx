import * as Haptics from 'expo-haptics';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthGrid, WeekStrip } from '@/components/calendar';
import { EmptyIllustration } from '@/components/empty-illustration';
import { ChevronRightIcon, GearIcon, MoreIcon, PlusIcon, StatsIcon } from '@/components/icons';
import { ReminderCard } from '@/components/reminder-card';
import { Button } from '@/components/ui';
import { WorkoutView } from '@/components/workout-view';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { addDays, addMonths, diffDays, isSameMonth, monthTitle, startOfMonth, type ISODate } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import { useSettings } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';
import { showWorkoutMenu } from '@/workouts/menu';
import { doneDates, lastDoneDate, lastDoneWorkout, workoutOnDate } from '@/workouts/queries';
import { reminderFor } from '@/workouts/reminder';
import { removeWorkout, renameWorkout, repeatWorkout } from '@/workouts/repo';
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
  const [lastWorkout] = useLive(() => lastDoneWorkout(db, today), [today]);
  const done = useLive(() => doneDates(db));
  const reminder = useMemo(() => reminderFor(new Set(done.map((d) => d.date)), today), [done, today]);
  // After a break, today's empty screen nudges back and offers to repeat the last workout.
  const nudge = selected === today && !workout && reminder && lastWorkout ? { reminder, lastWorkout } : null;

  const select = (date: ISODate) => {
    setSelected(date);
    setMonth(startOfMonth(date));
  };

  // After "move workout" the sheet sends us to the new day (`at` makes repeated moves to one date register).
  const { date: requested, at } = useLocalSearchParams<{ date?: string; at?: string }>();
  const request = requested ? `${requested}@${at}` : undefined;
  const [handled, setHandled] = useState(request);
  if (request !== handled) {
    setHandled(request);
    if (requested) select(requested);
  }

  // Swipe left for the next day, right for the previous one. The day follows the finger; on release
  // it either springs back or slides out with a fade while the next day slides in from the other side.
  // Cards with their own swipe (exercises, sets, the workout title) react sooner, so this only takes
  // swipes on the rest of the day; a mostly vertical move fails it and leaves the scroll alone.
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const dragX = useSharedValue(0);
  const fade = useSharedValue(1);
  const shift = SWIPE_SHIFT * width;

  const commitDay = (delta: -1 | 1) => {
    select(addDays(selected, delta));
    // Next frame the new day is on screen (still invisible): start it off to the side and settle it in.
    requestAnimationFrame(() => {
      dragX.set(reduced ? 0 : delta * shift);
      dragX.set(withTiming(0, { duration: 220, easing: EASE_OUT }));
      fade.set(withTiming(1, { duration: 220, easing: EASE_OUT }));
    });
  };

  const dayGesture = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      if (reduced) return;
      dragX.set(e.translationX * 0.85);
      fade.set(1 - Math.min(Math.abs(e.translationX) / width, 1) * 0.6);
    })
    .onEnd((e) => {
      const delta = e.translationX < -60 || e.velocityX < -600 ? 1 : e.translationX > 60 || e.velocityX > 600 ? -1 : 0;
      if (delta === 0) {
        dragX.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: e.velocityX }));
        fade.set(withTiming(1, { duration: 200, easing: EASE_OUT }));
        return;
      }
      scheduleOnRN(Haptics.selectionAsync);
      if (!reduced) dragX.set(withTiming(-delta * shift, { duration: 140, easing: EASE_OUT }));
      fade.set(
        withTiming(0, { duration: 140, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(commitDay, delta);
        }),
      );
    });

  const dayStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateX: dragX.get() }],
  }));

  const toggleMonth = (open: boolean) => {
    if (open === monthOpen) return;
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

      {/* Week strip ⇄ month grid: the calendar crossfades while its height, and everything below, eases into place. */}
      <Animated.View layout={CALENDAR_LAYOUT} style={styles.calendar}>
        {monthOpen ? (
          <Animated.View key="month" entering={CALENDAR_IN} exiting={CALENDAR_OUT}>
            <MonthGrid
              month={month}
              selected={selected}
              today={today}
              marks={marks}
              locale={language}
              onSelect={select}
            />
          </Animated.View>
        ) : (
          <Animated.View key="week" entering={CALENDAR_IN} exiting={CALENDAR_OUT}>
            <WeekStrip
              selected={selected}
              today={today}
              marks={marks}
              locale={language}
              onSelect={select}
            />
          </Animated.View>
        )}
      </Animated.View>

      <Animated.View layout={CALENDAR_LAYOUT}>
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
      </Animated.View>

      <Animated.View layout={CALENDAR_LAYOUT} style={styles.flex}>
        <GestureDetector gesture={dayGesture}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
            <Animated.View style={[styles.page, dayStyle]}>
              {workout ? (
                <WorkoutView key={workout.id} workout={workout} />
              ) : (
                <View style={styles.empty}>
                  {nudge ? (
                    <ReminderCard reminder={nudge.reminder} last={nudge.lastWorkout} today={today} />
                  ) : (
                    <>
                      <EmptyIllustration disc={colors.surface} ink={colors.text} spark={colors.placeholder} />
                      <Text style={[typography.title, { color: colors.text }]}>{emptyText}</Text>
                    </>
                  )}
                  <View style={styles.emptyActions}>
                    {nudge && (
                      <Button
                        title={t('reminder.repeat')}
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          repeatWorkout(db, nudge.lastWorkout.id, today);
                        }}
                      />
                    )}
                    <Button
                      title={t('day.pickProgram')}
                      variant={nudge ? 'secondary' : 'primary'}
                      onPress={() => openLibrary('programs')}
                    />
                    <Button title={t('day.pickExercises')} variant="secondary" onPress={() => openLibrary()} />
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </GestureDetector>
      </Animated.View>

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

/** How far a day slides while leaving or arriving, as a share of the screen width. */
const SWIPE_SHIFT = 0.3;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const CALENDAR_LAYOUT = LinearTransition.duration(260).easing(EASE_IN_OUT);
const CALENDAR_IN = FadeIn.duration(200).easing(EASE_OUT);
const CALENDAR_OUT = FadeOut.duration(120).easing(EASE_OUT);

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
  page: { flexGrow: 1 },
  calendar: { overflow: 'hidden' },
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
