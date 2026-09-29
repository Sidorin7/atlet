import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GearIcon } from '@/components/icons';
import { GradientCard, ListRow } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { programById, programExercisesOf } from '@/library/queries';
import { useColors } from '@/settings/provider';
import { spacing, typography } from '@/theme/tokens';

export default function ProgramScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const programId = Number(useLocalSearchParams<{ id: string }>().id);
  const [program] = useLive(() => programById(db, programId), [programId]);
  const items = useLive(() => programExercisesOf(db, programId), [programId]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              hitSlop={8}
              accessibilityLabel={t('program.editTitle')}
              onPress={() =>
                router.push({ pathname: '/library/program-edit', params: { id: String(programId) } })
              }
            >
              <GearIcon color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.list}>
        {program && (
          <GradientCard
            color={program.color}
            title={program.name}
            subtitle={t('library.exerciseCount', { count: items.length })}
          />
        )}
        {items.map((e, i) => (
          <ListRow
            key={e.id}
            left={
              <Text style={[typography.body, styles.index, { color: colors.textSecondary }]}>
                {i + 1}
              </Text>
            }
            title={e.name}
          />
        ))}
        <View />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  index: { width: 22 },
});
