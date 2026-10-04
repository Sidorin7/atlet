import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import ReanimatedSwipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { NestedReorderableList, useReorderableDrag } from 'react-native-reorderable-list';
import { scheduleOnRN } from 'react-native-worklets';

import { GroupIcon } from '@/components/group-icons';
import { ChevronRightIcon, ClockIcon, PlusIcon, StatsIcon, TrashIcon } from '@/components/icons';
import { GradientCard } from '@/components/ui';
import { db } from '@/db/client';
import type { workouts } from '@/db/schema';
import { useLive } from '@/db/use-live';
import { moveItem } from '@/library/utils';
import { shortDayLabel } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import { useColors, useSettings } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';
import { ghostPatch, suggestions } from '@/workouts/fields';
import { previousSession, setsOf, workoutExercisesOf, workoutSetSummary, workoutTiming } from '@/workouts/queries';
import { addSet, removeWorkout, removeWorkoutExercise, reorderWorkoutExercises } from '@/workouts/repo';
import { toTiming, workoutClock } from '@/workouts/timer';

import { NumberPadDone } from './number-pill';
import { NUMBER_WIDTH, SetRow, useSetFields } from './set-row';

type Workout = typeof workouts.$inferSelect;
type Item = ReturnType<typeof workoutExercisesOf>['_']['result'][number];

export function WorkoutView({ workout }: { workout: Workout }) {
  const { t } = useTranslation();
  const colors = useColors();
  const saved = useLive(() => workoutExercisesOf(db, workout.id), [workout.id]);
  // The list wants its data reordered right on drop; hold that order until the database catches up.
  const [dropped, setDropped] = useState<{ from: Item[]; order: Item[] } | null>(null);
  const items = dropped?.from === saved ? dropped.order : saved;
  const summary = useLive(() => workoutSetSummary(db, workout.id), [workout.id]);
  const filled = useMemo(() => new Map(summary.map((r) => [r.workoutExerciseId, r.filled])), [summary]);
  const clock = useWorkoutClock(workout);
  const clockLabel = clock && formatDuration(t, clock.minutes);

  // The first exercise starts open so a set can be typed straight away.
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || items.length === 0) return;
    opened.current = true;
    setExpanded(new Set([items[0].id]));
  }, [items]);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // Hold an exercise card to pick it up, then drag it up or down. The pan only wakes up after the
  // hold, so card swipes, day swipes and scrolling work as before.
  const dragPan = useMemo(() => Gesture.Pan().activateAfterLongPress(DRAG_DELAY), []);
  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = moveItem(items, from, to);
    setDropped({ from: saved, order: next });
    reorderWorkoutExercises(db, next.map((i) => i.id));
  };
  const move = (index: number, delta: -1 | 1) => {
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    Haptics.selectionAsync();
    reorder(index, to);
  };

  // Swipe the title card left to delete the whole workout; asks first only if sets were logged.
  const swipeRef = useRef<{ close: () => void } | null>(null);
  const deleteWorkout = () => {
    if (!summary.some((r) => r.filled > 0)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      removeWorkout(db, workout.id);
      return;
    }
    Alert.alert(t('workout.deleteConfirm', { name: workout.name }), t('workout.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel', onPress: () => swipeRef.current?.close() },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeWorkout(db, workout.id) },
    ]);
  };

  return (
    <View style={styles.list}>
      <ReanimatedSwipeable
        ref={swipeRef as never}
        friction={1.5}
        rightThreshold={SWIPE_THRESHOLD}
        overshootRight={false}
        onSwipeableOpen={deleteWorkout}
        renderRightActions={() => (
          <View style={[styles.swipeAction, styles.swipeRight, styles.cardAction, { backgroundColor: colors.danger }]}>
            <TrashIcon color="#FFFFFF" />
            <Text style={[typography.caption, styles.swipeText]}>{t('common.delete')}</Text>
          </View>
        )}
      >
        <View
          accessible
          accessibilityLabel={[workout.name, clockLabel, t('library.exerciseCount', { count: items.length })]
            .filter(Boolean)
            .join(', ')}
          accessibilityActions={[{ name: 'delete', label: t('workout.menuDelete') }]}
          onAccessibilityAction={deleteWorkout}
        >
          <GradientCard
            color={workout.color}
            title={workout.name}
            count={items.length}
            aside={
              clock && (
                <View style={styles.timer}>
                  <ClockIcon size={13} color="#FFFFFF" />
                  <Text style={styles.timerText}>{clockLabel}</Text>
                </View>
              )
            }
          />
        </View>
      </ReanimatedSwipeable>
      <NestedReorderableList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <ExerciseItem
            item={item}
            date={workout.date}
            open={expanded.has(item.id)}
            filledSets={filled.get(item.id) ?? 0}
            onToggle={() => toggle(item.id)}
            onMove={(delta) => move(index, delta)}
          />
        )}
        onReorder={({ from, to }) => reorder(from, to)}
        onDragStart={() => {
          'worklet';
          scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Medium);
        }}
        panGesture={dragPan}
        ItemSeparatorComponent={Separator}
        initialNumToRender={items.length}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
      />
      {items.length === 0 && (
        <Text style={[typography.body, styles.centered, { color: colors.textSecondary }]}>
          {t('day.noExercises')}
        </Text>
      )}
      <NumberPadDone />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

/** Time from the first logged set to the last; counts up live while the workout is going on. */
function useWorkoutClock(workout: Workout) {
  const today = useToday();
  const rows = useLive(() => workoutTiming(db, workout.id), [workout.id]);
  const timing = useMemo(() => toTiming(rows), [rows]);
  const [now, setNow] = useState(() => Date.now());
  // Only today's started workout can be running, so only it needs the clock to move.
  const live = workout.date === today && timing.times.length > 0;
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [live]);
  return workoutClock(timing, workout.date === today, now);
}

function formatDuration(t: ReturnType<typeof useTranslation>['t'], minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? t('workout.durationHours', { h, m }) : t('workout.durationMinutes', { m });
}

function ExerciseItem({
  item,
  date,
  open,
  filledSets,
  onToggle,
  onMove,
}: {
  item: Item;
  date: string;
  open: boolean;
  filledSets: number;
  onToggle: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const drag = useReorderableDrag();
  const swipeRef = useRef<{ close: () => void } | null>(null);

  const remove = () =>
    Alert.alert(t('workout.removeExerciseConfirm', { name: item.name }), t('workout.removeExerciseMessage'), [
      { text: t('common.cancel'), style: 'cancel', onPress: () => swipeRef.current?.close() },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => removeWorkoutExercise(db, item.id),
      },
    ]);

  const openStats = () =>
    router.push({ pathname: '/progress/exercise/[id]', params: { id: String(item.exerciseId) } });

  // Swipe left removes the exercise from the day (asking first only if sets were logged),
  // swipe right opens its history.
  const onSwipe = (direction: SwipeDirection) => {
    if (direction === SwipeDirection.RIGHT) {
      Haptics.selectionAsync();
      swipeRef.current?.close();
      openStats();
    } else if (filledSets > 0) {
      remove();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      removeWorkoutExercise(db, item.id);
    }
  };

  return (
    <View style={styles.card}>
      <ReanimatedSwipeable
        ref={swipeRef as never}
        friction={1.5}
        leftThreshold={SWIPE_THRESHOLD}
        rightThreshold={SWIPE_THRESHOLD}
        onSwipeableOpen={onSwipe}
        renderLeftActions={() => (
          <View style={[styles.swipeAction, styles.swipeLeft, { backgroundColor: colors.accent }]}>
            <StatsIcon size={20} color="#FFFFFF" />
            <Text style={[typography.caption, styles.swipeText]}>{t('workout.stats')}</Text>
          </View>
        )}
        renderRightActions={() => (
          <View style={[styles.swipeAction, styles.swipeRight, { backgroundColor: colors.danger }]}>
            <TrashIcon color="#FFFFFF" />
            <Text style={[typography.caption, styles.swipeText]}>{t('common.delete')}</Text>
          </View>
        )}
      >
        <Pressable
          onPress={onToggle}
          onLongPress={drag}
          delayLongPress={DRAG_DELAY - 20}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityActions={[
            { name: 'stats', label: t('workout.stats') },
            { name: 'moveUp', label: t('workout.moveUp') },
            { name: 'moveDown', label: t('workout.moveDown') },
            { name: 'delete', label: t('workout.removeExercise') },
          ]}
          onAccessibilityAction={(e) => {
            const action = e.nativeEvent.actionName;
            if (action === 'stats') openStats();
            else if (action === 'moveUp') onMove(-1);
            else if (action === 'moveDown') onMove(1);
            else remove();
          }}
          style={[styles.header, { backgroundColor: colors.surface }]}
        >
          <GroupIcon name={item.groupIcon} color={colors.text} />
          <View style={styles.headerText}>
            <Text numberOfLines={1} style={[typography.body, { color: colors.text }]}>
              {item.name}
            </Text>
            {filledSets > 0 && (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {t('workout.setsDone', { count: filledSets })}
              </Text>
            )}
          </View>
          <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
            <ChevronRightIcon color={colors.textSecondary} />
          </View>
        </Pressable>
      </ReanimatedSwipeable>
      {open && <Sets item={item} date={date} onRemove={remove} />}
    </View>
  );
}

function Sets({ item, date, onRemove }: { item: Item; date: string; onRemove: () => void }) {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const rows = useLive(() => setsOf(db, item.id), [item.id]);
  const last = useMemo(() => previousSession(db, item.exerciseId, date), [item.exerciseId, date]);
  const [focusId, setFocusId] = useState<number | null>(null);
  const fields = useSetFields(item.type);
  const ghosts = suggestions(fields, rows, last.sets);
  const canRepeat = rows.some((s, i) => ghostPatch(fields, s, ghosts[i]) !== null);

  const notes = [
    last.date && t('workout.lastTime', { date: shortDayLabel(last.date, language, date) }),
    canRepeat && t('workout.repeatHint'),
  ].filter(Boolean);
  const noteText = notes.join(' · ');

  return (
    <View style={styles.sets}>
      {notes.length > 0 && (
        <Text style={[typography.caption, styles.notes, { color: colors.textSecondary }]}>
          {noteText.charAt(0).toUpperCase() + noteText.slice(1)}
        </Text>
      )}
      {rows.length > 0 && (
        <View style={styles.columns} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.numberColumn} />
          {fields.map((f) => (
            <Text key={f.unit} style={[typography.caption, styles.column, { color: colors.textSecondary }]}>
              {f.unit}
            </Text>
          ))}
        </View>
      )}
      {rows.map((s, i) => (
        <SetRow
          key={s.id}
          set={s}
          index={i}
          type={item.type}
          ghost={ghosts[i]}
          autoFocus={s.id === focusId}
        />
      ))}
      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setFocusId(addSet(db, item.id));
          }}
          accessibilityRole="button"
          style={[styles.addSet, { borderColor: colors.placeholder }]}
        >
          <PlusIcon size={16} color={colors.textSecondary} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{t('workout.addSet')}</Text>
        </Pressable>
        <Pressable
          onPress={onRemove}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={t('workout.removeExercise')}
          style={styles.remove}
        >
          <TrashIcon size={18} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const SWIPE_WIDTH = 96;
const SWIPE_THRESHOLD = 72;
/** How often a running workout timer refreshes, ms. */
const TICK_MS = 10_000;
/** How long an exercise card is held before it can be dragged, ms. */
const DRAG_DELAY = 400;

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  centered: { textAlign: 'center' },
  card: { gap: spacing.sm },
  separator: { height: spacing.sm },
  header: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 60,
  },
  headerText: { flex: 1, gap: 2 },
  swipeAction: {
    width: SWIPE_WIDTH,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeLeft: { marginRight: 6 },
  swipeRight: { marginLeft: 6 },
  swipeText: { color: '#FFFFFF' },
  cardAction: { borderRadius: radius.lg },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  timerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  sets: { paddingBottom: spacing.xs },
  notes: { paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  columns: { flexDirection: 'row', gap: 6 },
  numberColumn: { width: NUMBER_WIDTH },
  column: { flex: 1, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 6, marginTop: 3 },
  addSet: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  remove: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center' },
});
