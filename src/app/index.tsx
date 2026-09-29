import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GearIcon, HeartIcon } from '@/components/icons';
import { db } from '@/db/client';
import { muscleGroups } from '@/db/schema';
import { useColors } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';

// Stage 1 placeholder: proves DB, seed, theme and i18n are wired. Replaced by the day screen in stage 3.
export default function DayScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { data: groups } = useLiveQuery(db.select().from(muscleGroups).orderBy(muscleGroups.position));

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>{t('common.today')}</Text>
        <View style={styles.headerButtons}>
          <Pressable hitSlop={8} accessibilityRole="button">
            <HeartIcon color={colors.text} />
          </Pressable>
          <Link href="/settings" asChild>
            <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={t('settings.title')}>
              <GearIcon color={colors.text} />
            </Pressable>
          </Link>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {groups.map((g) => (
          <View key={g.id} style={[styles.row, { backgroundColor: colors.surface }]}>
            <Text style={[typography.body, { color: colors.text }]}>{g.name}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButtons: { flexDirection: 'row', gap: spacing.md },
  list: { padding: spacing.md, gap: spacing.sm },
  row: { borderRadius: radius.md, padding: spacing.md },
});
