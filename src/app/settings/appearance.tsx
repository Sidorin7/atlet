import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Options, Section } from '@/components/settings-ui';
import { themeOptions } from '@/settings/options';
import { useSettings } from '@/settings/provider';
import { setSetting } from '@/settings/store';
import { spacing } from '@/theme/tokens';

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const { themePref } = useSettings();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title={t('settings.theme')}>
        <Options options={themeOptions(t)} selected={themePref} onSelect={(v) => setSetting('theme', v)} />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
});
