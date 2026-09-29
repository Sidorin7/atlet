import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GearIcon } from '@/components/icons';
import { Button, GradientCard, ListRow } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { dayMonthLabel } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import { programById, programExercisesOf } from '@/library/queries';
import { useSettings } from '@/settings/provider';
import { spacing, typography } from '@/theme/tokens';
import { addProgramToDate } from '@/workouts/repo';

export default function ProgramScreen() {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const today = useToday();
  const params = useLocalSearchParams<{ id: string; date?: string }>();
  const programId = Number(params.id);
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
      </ScrollView>
      {params.date && (
        <View style={styles.footer}>
          <Button
            title={
              params.date === today
                ? t('program.selectToday')
                : t('program.selectDate', { date: dayMonthLabel(params.date, language) })
            }
            onPress={() => {
              addProgramToDate(db, params.date!, programId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.dismissTo('/');
            }}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  index: { width: 22 },
  footer: { padding: spacing.md },
});
