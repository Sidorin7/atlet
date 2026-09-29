import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackupIcon, GlobeIcon, MailIcon, SunIcon } from '@/components/icons';
import { SettingsRow } from '@/components/settings-ui';
import { CloseButton } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { shortDayLabel } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import { CONTACT_EMAIL, languageOptions, themeOptions } from '@/settings/options';
import { useSettings } from '@/settings/provider';
import { radius, spacing, statsGradient, typography } from '@/theme/tokens';
import { doneWorkoutStats } from '@/workouts/queries';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, themePref, languagePref } = useSettings();
  const iconColor = colors.textSecondary;

  const contact = async () => {
    try {
      await Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=GymApp`);
    } catch {
      Alert.alert(t('settings.contacts'), t('settings.mailFailed', { email: CONTACT_EMAIL }));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        <CloseButton label={t('common.close')} onPress={() => router.dismissTo('/')} />
      </View>

      <StatsCard />

      <View>
        <SettingsRow
          icon={<BackupIcon color={iconColor} />}
          title={t('settings.backup')}
          onPress={() => router.push('/settings/backup')}
        />
        <SettingsRow
          icon={<SunIcon color={iconColor} />}
          title={t('settings.appearance')}
          value={themeOptions(t).find((o) => o.value === themePref)?.label}
          onPress={() => router.push('/settings/appearance')}
        />
        <SettingsRow
          icon={<GlobeIcon color={iconColor} />}
          title={t('settings.language')}
          value={languageOptions(t).find((o) => o.value === languagePref)?.label}
          onPress={() => router.push('/settings/language')}
        />
        <SettingsRow icon={<MailIcon color={iconColor} />} title={t('settings.contacts')} onPress={contact} />
      </View>
    </ScrollView>
  );
}

/** Blue card: how many workouts are done and since when. */
function StatsCard() {
  const { t } = useTranslation();
  const { language } = useSettings();
  const today = useToday();
  const [stats] = useLive(() => doneWorkoutStats(db));
  const count = stats?.count ?? 0;

  return (
    <LinearGradient
      colors={[...statsGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.count}>
        {count} <Text style={styles.countWord}>{t('settings.workouts', { count })}</Text>
      </Text>
      <View style={styles.pill}>
        <Text style={[typography.caption, styles.pillText]}>
          {stats?.first
            ? t('settings.since', { date: shortDayLabel(stats.first, language, today) })
            : t('settings.noneYet')}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: 12,
  },
  count: { fontSize: 30, fontWeight: '800', color: '#FFFFFF' },
  countWord: { color: 'rgba(255,255,255,0.8)' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  pillText: { color: '#FFFFFF' },
});
