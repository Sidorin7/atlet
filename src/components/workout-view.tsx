import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupIcon } from '@/components/group-icons';
import { ChevronRightIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { GradientCard } from '@/components/ui';
import { db } from '@/db/client';
import type { workouts } from '@/db/schema';
import { useLive } from '@/db/use-live';
import { shortDayLabel } from '@/lib/dates';
import { useColors, useSettings } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';
import { ghostPatch, suggestions } from '@/workouts/fields';
import { previousSession, setsOf, workoutExercisesOf, workoutSetSummary } from '@/workouts/queries';
import { addSet, removeWorkoutExercise } from '@/workouts/repo';

import { NumberPadDone } from './number-pill';
import { NUMBER_WIDTH, SetRow, useSetFields } from './set-row';

type Workout = typeof workouts.$inferSelect;
type Item = ReturnType<typeof workoutExercisesOf>['_']['result'][number];

export function WorkoutView({ workout }: { workout: Workout }) {
  const { t } = useTranslation();
  const colors = useColors();
  const items = useLive(() => workoutExercisesOf(db, workout.id), [workout.id]);
  const summary = useLive(() => workoutSetSummary(db, workout.id), [workout.id]);
  const filled = useMemo(() => new Map(summary.map((r) => [r.workoutExerciseId, r.filled])), [summary]);

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

  return (
    <View style={styles.list}>
      <GradientCard
        color={workout.color}
        title={workout.name}
        subtitle={t('library.exerciseCount', { count: items.length })}
      />
      {items.map((item) => (
        <ExerciseItem
          key={item.id}
          item={item}
          date={workout.date}
          open={expanded.has(item.id)}
          filledSets={filled.get(item.id) ?? 0}
          onToggle={() => toggle(item.id)}
        />
      ))}
      {items.length === 0 && (
        <Text style={[typography.body, styles.centered, { color: colors.textSecondary }]}>
          {t('day.noExercises')}
        </Text>
      )}
      <NumberPadDone />
    </View>
  );
}

function ExerciseItem({
  item,
  date,
  open,
  filledSets,
  onToggle,
}: {
  item: Item;
  date: string;
  open: boolean;
  filledSets: number;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();

  const remove = () =>
    Alert.alert(t('workout.removeExerciseConfirm', { name: item.name }), t('workout.removeExerciseMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => removeWorkoutExercise(db, item.id),
      },
    ]);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
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

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  centered: { textAlign: 'center' },
  card: { gap: spacing.sm },
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
