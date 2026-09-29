import { router, Stack, useLocalSearchParams } from 'expo-router';

import { closeScreen } from '@/library/nav';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GroupIcon } from '@/components/group-icons';
import { PlusIcon } from '@/components/icons';
import { Button, HeaderSave, RadioRow, SectionLabel, TextField } from '@/components/ui';
import { db } from '@/db/client';
import type { ExerciseType } from '@/db/schema';
import { useLive } from '@/db/use-live';
import { exerciseById, groupsWithCounts } from '@/library/queries';
import { createExercise, hasHistory, removeExercise, updateExercise } from '@/library/repo';
import { useColors } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';

export default function ExerciseEditScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string; groupId?: string }>();
  const exerciseId = params.id ? Number(params.id) : null;

  const groups = useLive(() => groupsWithCounts(db));
  const [initial] = useState(() => (exerciseId ? exerciseById(db, exerciseId).all()[0] : undefined));
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<ExerciseType>(initial?.type ?? 'weight');
  const [groupId, setGroupId] = useState<number | null>(
    initial?.groupId ?? (params.groupId ? Number(params.groupId) : null),
  );

  const canSave = name.trim() !== '' && groupId !== null;

  const save = () => {
    if (groupId === null) return;
    if (exerciseId) updateExercise(db, exerciseId, { name, groupId, type });
    else createExercise(db, { name, groupId, type });
    closeScreen();
  };

  const remove = () => {
    if (!exerciseId) return;
    const message = hasHistory(db, exerciseId) ? t('exercise.deleteArchived') : undefined;
    Alert.alert(t('exercise.deleteConfirm', { name }), message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeExercise(db, exerciseId);
          closeScreen();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: exerciseId ? t('exercise.editTitle') : t('exercise.newTitle'),
          headerRight: () => (
            <HeaderSave title={t('common.save')} onPress={save} disabled={!canSave} />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View>
          <SectionLabel>{t('exercise.name')}</SectionLabel>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder={t('exercise.namePlaceholder')}
            autoFocus={!exerciseId}
          />
        </View>

        <View>
          <SectionLabel>{t('exercise.type')}</SectionLabel>
          <View style={styles.types}>
            {(['weight', 'bodyweight', 'cardio'] as const).map((value) => (
              <RadioRow
                key={value}
                title={t(`exercise.types.${value}`)}
                selected={type === value}
                onPress={() => setType(value)}
              />
            ))}
          </View>
        </View>

        <View>
          <SectionLabel>{t('exercise.group')}</SectionLabel>
          <View style={styles.chips}>
            {groups.map((g) => {
              const selected = g.id === groupId;
              const fg = selected ? colors.onAccent : colors.text;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setGroupId(g.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.chip, { backgroundColor: selected ? colors.accent : colors.surface }]}
                >
                  <GroupIcon name={g.icon} size={18} color={fg} />
                  <Text style={[typography.body, { color: fg }]}>{g.name}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => router.push('/library/group-edit')}
              accessibilityRole="button"
              style={[styles.chip, { backgroundColor: colors.surface }]}
            >
              <PlusIcon size={18} color={colors.text} />
              <Text style={[typography.body, { color: colors.text }]}>{t('exercise.newGroup')}</Text>
            </Pressable>
          </View>
        </View>

        {exerciseId && <Button title={t('exercise.delete')} variant="danger" onPress={remove} />}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  types: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
