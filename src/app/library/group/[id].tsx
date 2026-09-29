import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { GearIcon, PlusIcon } from '@/components/icons';
import { EmptyText, ListRow } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { exercisesInGroup, groupById } from '@/library/queries';
import { useColors } from '@/settings/provider';
import { spacing } from '@/theme/tokens';

export default function GroupScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const groupId = Number(useLocalSearchParams<{ id: string }>().id);
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
            onPress={() =>
              router.push({ pathname: '/library/exercise-edit', params: { id: String(e.id) } })
            }
          />
        ))}
        {items.length === 0 && <EmptyText>{t('library.emptyGroup')}</EmptyText>}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
});
