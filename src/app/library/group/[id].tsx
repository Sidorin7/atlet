import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GearIcon, PlusIcon } from '@/components/icons';
import { AddMark, Button, EmptyText, ListRow } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { exercisesInGroup, groupById } from '@/library/queries';
import { useAddToDay } from '@/library/use-add-to-day';
import { useColors } from '@/settings/provider';
import { spacing } from '@/theme/tokens';

const editExercise = (id: number) =>
  router.push({ pathname: '/library/exercise-edit', params: { id: String(id) } });

export default function GroupScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string; date?: string }>();
  const groupId = Number(params.id);
  const { counts, total, add } = useAddToDay(params.date);
  const [group] = useLive(() => groupById(db, groupId), [groupId]);
  const items = useLive(() => exercisesInGroup(db, groupId), [groupId]);

  return (
    <>
      <Stack.Screen
        options={{
          title: group?.name ?? '',
          headerRight: () => (
            <Pressable
              hitSlop={8}
              accessibilityLabel={t('group.editTitle')}
              onPress={() =>
                router.push({ pathname: '/library/group-edit', params: { id: String(groupId) } })
              }
            >
              <GearIcon color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.list}>
        <ListRow
          title={t('library.createExercise')}
          right={<PlusIcon color={colors.text} />}
          onPress={() =>
            router.push({ pathname: '/library/exercise-edit', params: { groupId: String(groupId) } })
          }
        />
        {items.map((e) => (
          <ListRow
            key={e.id}
            title={e.name}
            subtitle={t(`exercise.types.${e.type}`)}
            right={params.date ? <AddMark count={counts.get(e.id)} /> : undefined}
            onPress={() => (add(e.id) ? undefined : editExercise(e.id))}
            onLongPress={() => editExercise(e.id)}
          />
        ))}
        {items.length === 0 && <EmptyText>{t('library.emptyGroup')}</EmptyText>}
      </ScrollView>
      {total > 0 && (
        <View style={styles.footer}>
          <Button title={t('library.addedDone', { count: total })} onPress={() => router.dismissTo('/')} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  footer: { padding: spacing.md, paddingBottom: spacing.lg },
});
