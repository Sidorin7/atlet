import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { db } from '@/db/client';
import type { ExerciseType } from '@/db/schema';
import { useColors } from '@/settings/provider';
import { radius, typography } from '@/theme/tokens';
import { fieldsFor, ghostPatch, type Field, type SetRecord } from '@/workouts/fields';
import { deleteSet, updateSet } from '@/workouts/repo';

import { NumberPill, PILL_HEIGHT } from './number-pill';

/** The two input fields of a set for this exercise type, with translated units. */
export function useSetFields(type: ExerciseType): [Field, Field] {
  const { t } = useTranslation();
  return fieldsFor(type, {
    kg: t('workout.unitKg'),
    load: t('workout.unitLoad'),
    reps: t('workout.unitReps'),
    min: t('workout.unitMin'),
    km: t('workout.unitKm'),
  });
}

export const NUMBER_WIDTH = 36;

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
  /** Suggested values (the set above, or last time), shown grey in empty fields. */
  ghost?: SetRecord;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const swipeRef = useRef<{ close: () => void } | null>(null);
  const [a, b] = useSetFields(type);
  const patch = ghostPatch([a, b], set, ghost);

  const fillFromGhost = () => {
    if (!patch) return;
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
          <Text style={[typography.caption, styles.deleteText]}>{t('common.delete')}</Text>
        </Pressable>
      )}
    >
      <View style={[styles.row, { backgroundColor: colors.background }]}>
        {/* While the suggestion can be copied in, the number is outlined to show it is tappable. */}
        <Pressable
          onPress={fillFromGhost}
          disabled={!patch}
          hitSlop={6}
          accessibilityRole={patch ? 'button' : 'text'}
          accessibilityLabel={t(patch ? 'workout.repeatSet' : 'workout.setNumber', { n: index + 1 })}
          style={({ pressed }) => [
            styles.number,
            { opacity: pressed ? 0.6 : 1 },
            patch && { borderWidth: 1.5, borderColor: colors.textSecondary },
          ]}
        >
          <Text style={[typography.caption, { color: patch ? colors.text : colors.textSecondary }]}>
            {index + 1}
          </Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  number: {
    width: NUMBER_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delete: {
    width: 80,
    marginVertical: 3,
    marginLeft: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#FFFFFF' },
});
