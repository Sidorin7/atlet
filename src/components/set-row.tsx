import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type KeyboardTypeOptions } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { db } from '@/db/client';
import type { ExerciseType, sets } from '@/db/schema';
import { useColors } from '@/settings/provider';
import { radius, typography } from '@/theme/tokens';

import { NumberPill } from './number-pill';
import { kmToMeters, metersToKm, minutesToSeconds, secondsToMinutes } from '@/workouts/numbers';
import { deleteSet, updateSet, type SetValues } from '@/workouts/repo';

type SetRecord = typeof sets.$inferSelect;

type Field = {
  read: (s: SetRecord) => number | null;
  write: (n: number | null) => SetValues;
  unit: string;
  keyboard: KeyboardTypeOptions;
  signed?: boolean;
};

type Units = { kg: string; load: string; reps: string; min: string; km: string };

function fieldsFor(type: ExerciseType, u: Units): [Field, Field] {
  switch (type) {
    case 'cardio':
      return [
        {
          read: (s) => secondsToMinutes(s.durationSec),
          write: (n) => ({ durationSec: minutesToSeconds(n) }),
          unit: u.min,
          keyboard: 'decimal-pad',
        },
        {
          read: (s) => metersToKm(s.distanceM),
          write: (n) => ({ distanceM: kmToMeters(n) }),
          unit: u.km,
          keyboard: 'decimal-pad',
        },
      ];
    case 'bodyweight':
      return [
        {
          read: (s) => s.weightKg,
          write: (n) => ({ weightKg: n }),
          unit: u.load,
          keyboard: 'numbers-and-punctuation',
          signed: true,
        },
        { read: (s) => s.reps, write: (n) => ({ reps: n === null ? null : Math.round(n) }), unit: u.reps, keyboard: 'number-pad' },
      ];
    default:
      return [
        { read: (s) => s.weightKg, write: (n) => ({ weightKg: n }), unit: u.kg, keyboard: 'decimal-pad' },
        { read: (s) => s.reps, write: (n) => ({ reps: n === null ? null : Math.round(n) }), unit: u.reps, keyboard: 'number-pad' },
      ];
  }
}

export function SetRow({
  set,
  index,
  type,
  ghost,
  autoFocus,
}: {
  set: SetRecord;
  index: number;
  type: ExerciseType;
  /** The same-numbered set from last time, shown grey in empty fields. */
  ghost?: SetRecord;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const swipeRef = useRef<{ close: () => void } | null>(null);
  const [a, b] = fieldsFor(type, {
    kg: t('workout.unitKg'),
    load: t('workout.unitLoad'),
    reps: t('workout.unitReps'),
    min: t('workout.unitMin'),
    km: t('workout.unitKm'),
  });

  const fillFromGhost = () => {
    if (!ghost) return;
    const patch: SetValues = {};
    for (const f of [a, b]) {
      if (f.read(set) === null && f.read(ghost) !== null) Object.assign(patch, f.write(f.read(ghost)));
    }
    if (Object.keys(patch).length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSet(db, set.id, patch);
  };

  return (
    <ReanimatedSwipeable
      ref={swipeRef as never}
      overshootRight={false}
      rightThreshold={40}
      friction={2}
      renderRightActions={() => (
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteSet(db, set.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('common.delete')}
          style={[styles.delete, { backgroundColor: colors.danger }]}
        >
          <Text style={[typography.body, styles.deleteText]}>{t('common.delete')}</Text>
        </Pressable>
      )}
    >
      <View style={[styles.row, { backgroundColor: colors.background }]}>
        <Pressable
          onPress={fillFromGhost}
          hitSlop={6}
          accessibilityRole="button"
          style={[styles.number, { backgroundColor: colors.surface }]}
        >
          <Text style={[typography.body, { color: colors.textSecondary }]}>{index + 1}</Text>
        </Pressable>
        <NumberPill
          value={a.read(set)}
          ghost={ghost ? a.read(ghost) : null}
          unit={a.unit}
          keyboard={a.keyboard}
          signed={a.signed}
          autoFocus={autoFocus}
          onCommit={(n) => updateSet(db, set.id, a.write(n))}
        />
        <NumberPill
          value={b.read(set)}
          ghost={ghost ? b.read(ghost) : null}
          unit={b.unit}
          keyboard={b.keyboard}
          signed={b.signed}
          onCommit={(n) => updateSet(db, set.id, b.write(n))}
        />
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  number: {
    width: 44,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delete: {
    width: 96,
    marginVertical: 4,
    marginLeft: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#FFFFFF' },
});
