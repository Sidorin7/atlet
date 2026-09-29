import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Options, Section } from '@/components/settings-ui';
import { languageOptions } from '@/settings/options';
import { useSettings } from '@/settings/provider';
import { setSetting } from '@/settings/store';
import { spacing } from '@/theme/tokens';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const { languagePref } = useSettings();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section>
        <Options
          options={languageOptions(t)}
          selected={languagePref}
          onSelect={(v) => setSetting('language', v)}
        />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
});
