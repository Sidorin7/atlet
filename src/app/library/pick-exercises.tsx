import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { GroupIcon } from '@/components/group-icons';
import { CheckIcon } from '@/components/icons';
import { Button, EmptyText, ListRow, TextField } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { allExercises } from '@/library/queries';
import { programDraft, useProgramDraft } from '@/library/program-draft';
import { filterExercises } from '@/library/utils';
import { useColors } from '@/settings/provider';
import { spacing } from '@/theme/tokens';

export default function PickExercisesScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const draft = useProgramDraft();
  const [query, setQuery] = useState('');
  const exercises = useLive(() => allExercises(db));
  const shown = useMemo(() => filterExercises(exercises, query), [exercises, query]);

  const toggle = (id: number) => {
    const ids = draft.exerciseIds;
    programDraft.set({
      exerciseIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    });
  };

  return (
    <View style={styles.flex}>
      <View style={styles.search}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder={t('library.search')}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {shown.map((e) => (
          <ListRow
            key={e.id}
            left={<GroupIcon name={e.groupIcon} color={colors.text} />}
            title={e.name}
            subtitle={e.groupName}
            right={draft.exerciseIds.includes(e.id) ? <CheckIcon color={colors.text} /> : undefined}
            onPress={() => toggle(e.id)}
          />
        ))}
        {shown.length === 0 && <EmptyText>{t('library.noResults')}</EmptyText>}
      </ScrollView>
      <View style={styles.footer}>
        <Button title={t('common.save')} onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { padding: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  footer: { padding: spacing.md },
});
