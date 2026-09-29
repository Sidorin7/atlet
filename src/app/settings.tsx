import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { backupSummary, importBackup, InvalidBackupError } from '@/backup/backup';
import { pickBackup, shareBackup } from '@/backup/files';
import { CheckIcon } from '@/components/icons';
import { CloseButton, ListRow } from '@/components/ui';
import { db } from '@/db/client';
import { useSettings } from '@/settings/provider';
import type { LanguagePref, ThemePref } from '@/settings/resolve';
import { setSetting } from '@/settings/store';
import { radius, spacing, typography } from '@/theme/tokens';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { themePref, languagePref } = useSettings();

  const themeOptions: { value: ThemePref; label: string }[] = [
    { value: 'system', label: t('settings.system') },
    { value: 'light', label: t('settings.light') },
    { value: 'dark', label: t('settings.dark') },
  ];
  const languageOptions: { value: LanguagePref; label: string }[] = [
    { value: 'system', label: t('settings.system') },
    { value: 'ru', label: t('settings.russian') },
    { value: 'en', label: t('settings.english') },
  ];

  const exportData = async () => {
    try {
      await shareBackup(db);
    } catch {
      Alert.alert(t('backup.errorTitle'), t('backup.exportFailed'));
    }
  };

  const importData = async () => {
    try {
      const backup = await pickBackup();
      if (!backup) return;
      Alert.alert(t('backup.confirmTitle'), t('backup.confirmMessage', backupSummary(backup)), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.replace'),
          style: 'destructive',
          onPress: () => {
            try {
              importBackup(db, backup);
              Alert.alert(t('backup.importedTitle'));
            } catch {
              Alert.alert(t('backup.errorTitle'), t('backup.errorMessage'));
            }
          },
        },
      ]);
    } catch (e) {
      if (e instanceof InvalidBackupError) Alert.alert(t('backup.invalidTitle'), t('backup.invalidMessage'));
      else Alert.alert(t('backup.errorTitle'), t('backup.errorMessage'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Title>{t('settings.title')}</Title>
        <CloseButton label={t('common.close')} onPress={() => router.dismissTo('/')} />
      </View>
      <Section title={t('settings.theme')}>
        <Options options={themeOptions} selected={themePref} onSelect={(v) => setSetting('theme', v)} />
      </Section>
      <Section title={t('settings.language')}>
        <Options
          options={languageOptions}
          selected={languagePref}
          onSelect={(v) => setSetting('language', v)}
        />
      </Section>
      <Section title={t('settings.data')}>
        <ListRow title={t('settings.export')} onPress={exportData} chevron />
        <ListRow title={t('settings.import')} onPress={importData} chevron />
      </Section>
      <HintText>{t('settings.dataHint')}</HintText>
    </ScrollView>
  );
}

function HintText({ children }: { children: string }) {
  const { colors } = useSettings();
  return <Text style={[typography.caption, { color: colors.textSecondary }]}>{children}</Text>;
}

function Title({ children }: { children: string }) {
  const { colors } = useSettings();
  return <Text style={[typography.title, { color: colors.text }]}>{children}</Text>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useSettings();
  return (
    <View style={styles.section}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.group, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

function Options<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const { colors } = useSettings();
  return options.map((o) => (
    <Pressable
      key={o.value}
      onPress={() => onSelect(o.value)}
      accessibilityRole="radio"
      accessibilityState={{ selected: o.value === selected }}
      style={styles.option}
    >
      <Text style={[typography.body, { color: colors.text }]}>{o.label}</Text>
      {o.value === selected && <CheckIcon color={colors.text} />}
    </Pressable>
  ));
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: spacing.sm },
  group: { borderRadius: radius.lg, overflow: 'hidden' },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
});
