import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/components/icons';
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title>{t('settings.title')}</Title>
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
    </ScrollView>
  );
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
