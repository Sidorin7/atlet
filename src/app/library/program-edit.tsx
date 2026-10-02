import { router, Stack, useLocalSearchParams } from 'expo-router';

import { closeScreen } from '@/library/nav';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReorderableList, { useReorderableDrag } from 'react-native-reorderable-list';

import { CloseIcon, GripIcon, PlusIcon } from '@/components/icons';
import { Button, ColorPicker, EmptyText, HeaderSave, ListRow, SectionLabel, TextField } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { allExercises, programById, programExercisesOf } from '@/library/queries';
import { emptyDraft, programDraft, useProgramDraft, type ProgramDraft } from '@/library/program-draft';
import { createProgram, deleteProgram, updateProgram } from '@/library/repo';
import { moveItem } from '@/library/utils';
import { useColors } from '@/settings/provider';
import type { ProgramColor } from '@/theme/tokens';
import { spacing } from '@/theme/tokens';

function loadDraft(programId: number | null): ProgramDraft {
  if (!programId) return emptyDraft();
  const [program] = programById(db, programId).all();
  if (!program) return emptyDraft();
  return {
    name: program.name,
    color: program.color as ProgramColor,
    exerciseIds: programExercisesOf(db, programId).all().map((r) => r.exerciseId),
  };
}

export default function ProgramEditScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const programId = id ? Number(id) : null;

  // Load the program into the shared draft before the first render reads it; the picker screen
  // edits that draft too. Opening the editor again reloads it, so nothing stale carries over.
  const [loaded, setLoaded] = useState<number | null>();
  if (loaded !== programId) {
    programDraft.reset(loadDraft(programId));
    setLoaded(programId);
  }
  const draft = useProgramDraft();

  const exercises = useLive(() => allExercises(db));
  const names = useMemo(() => new Map(exercises.map((e) => [e.id, e.name])), [exercises]);

  const save = () => {
    if (programId) updateProgram(db, programId, draft);
    else createProgram(db, draft);
    closeScreen();
  };

  const remove = () => {
    if (!programId) return;
    Alert.alert(t('program.deleteConfirm', { name: draft.name }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteProgram(db, programId);
          router.dismissTo('/library');
        },
      },
    ]);
  };

  const header = (
    <View style={styles.header}>
      <View>
        <SectionLabel>{t('program.name')}</SectionLabel>
        <TextField
          value={draft.name}
          onChangeText={(name) => programDraft.set({ name })}
          placeholder={t('program.namePlaceholder')}
          autoFocus={!programId}
        />
      </View>
      <View>
        <SectionLabel>{t('program.color')}</SectionLabel>
        <ColorPicker value={draft.color} onChange={(color) => programDraft.set({ color })} />
      </View>
      <SectionLabel>{t('program.exercises')}</SectionLabel>
    </View>
  );

  const footer = (
    <View style={styles.footerList}>
      {draft.exerciseIds.length === 0 && <EmptyText>{t('program.empty')}</EmptyText>}
      <ListRow
        title={t('program.addExercises')}
        right={<PlusIcon color={colors.text} />}
        onPress={() => router.push('/library/pick-exercises')}
      />
      {programId && <Button title={t('program.delete')} variant="danger" onPress={remove} />}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: programId ? t('program.editTitle') : t('program.newTitle'),
          headerRight: () => (
            <HeaderSave title={t('common.save')} onPress={save} disabled={draft.name.trim() === ''} />
          ),
        }}
      />
      <GestureHandlerRootView style={styles.flex}>
          <ReorderableList
            data={draft.exerciseIds}
            keyExtractor={(exerciseId) => String(exerciseId)}
            onReorder={({ from, to }) =>
              programDraft.set({ exerciseIds: moveItem(draft.exerciseIds, from, to) })
            }
            renderItem={({ item }) => (
              <ExerciseRow
                name={names.get(item) ?? ''}
                onRemove={() =>
                  programDraft.set({ exerciseIds: draft.exerciseIds.filter((x) => x !== item) })
                }
              />
            )}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          />
      </GestureHandlerRootView>
    </>
  );
}

function ExerciseRow({ name, onRemove }: { name: string; onRemove: () => void }) {
  const colors = useColors();
  const drag = useReorderableDrag();
  return (
    <View style={styles.rowGap}>
      <ListRow
        left={
          <Pressable onPressIn={drag} hitSlop={10} accessibilityLabel="Reorder">
            <GripIcon color={colors.textSecondary} />
          </Pressable>
        }
        title={name}
        right={
          <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button">
            <CloseIcon color={colors.textSecondary} />
          </Pressable>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.md },
  rowGap: { marginBottom: spacing.sm },
  footerList: { gap: spacing.sm },
});
