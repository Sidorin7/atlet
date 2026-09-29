import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { GroupIcon } from '@/components/group-icons';
import { PlusIcon } from '@/components/icons';
import { EmptyText, GradientCard, ListRow, Segmented, TextField } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { allExercises, groupsWithCounts, programsWithCounts } from '@/library/queries';
import { filterExercises } from '@/library/utils';
import { useColors } from '@/settings/provider';
import { spacing } from '@/theme/tokens';

type Tab = 'exercises' | 'programs';

export default function LibraryHome() {
  const { t } = useTranslation();
  const colors = useColors();
  const [tab, setTab] = useState<Tab>('exercises');
  const [query, setQuery] = useState('');

  const groups = useLive(() => groupsWithCounts(db));
  const exercises = useLive(() => allExercises(db));
  const programs = useLive(() => programsWithCounts(db));

  const q = query.trim();
  const found = useMemo(() => filterExercises(exercises, q), [exercises, q]);
  const foundPrograms = useMemo(() => filterExercises(programs, q), [programs, q]);

  return (
    <View style={styles.flex}>
      <View style={styles.top}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder={t('library.search')}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'exercises', label: t('library.tabExercises') },
            { value: 'programs', label: t('library.tabPrograms') },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {tab === 'exercises' && q === '' && (
          <>
            <ListRow
              title={t('library.createExercise')}
              right={<PlusIcon color={colors.text} />}
              onPress={() => router.push('/library/exercise-edit')}
            />
            {groups.map((g) => (
              <ListRow
                key={g.id}
                left={<GroupIcon name={g.icon} color={colors.text} />}
                title={g.name}
                subtitle={t('library.exerciseCount', { count: g.exerciseCount })}
                chevron
                onPress={() =>
                  router.push({ pathname: '/library/group/[id]', params: { id: String(g.id) } })
                }
              />
            ))}
          </>
        )}

        {tab === 'exercises' && q !== '' && (
          <>
            {found.map((e) => (
              <ListRow
                key={e.id}
                left={<GroupIcon name={e.groupIcon} color={colors.text} />}
                title={e.name}
                subtitle={e.groupName}
                onPress={() =>
                  router.push({ pathname: '/library/exercise-edit', params: { id: String(e.id) } })
                }
              />
            ))}
            {found.length === 0 && <EmptyText>{t('library.noResults')}</EmptyText>}
          </>
        )}

        {tab === 'programs' && (
          <>
            {q === '' && (
              <ListRow
                title={t('library.createProgram')}
                right={<PlusIcon color={colors.text} />}
                onPress={() => router.push('/library/program-edit')}
              />
            )}
            {foundPrograms.map((p) => (
              <GradientCard
                key={p.id}
                color={p.color}
                title={p.name}
                subtitle={t('library.exerciseCount', { count: p.exerciseCount })}
                onPress={() =>
                  router.push({ pathname: '/library/program/[id]', params: { id: String(p.id) } })
                }
              />
            ))}
            {foundPrograms.length === 0 && (
              <EmptyText>{q === '' ? t('library.emptyPrograms') : t('library.noResults')}</EmptyText>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md },
  list: { padding: spacing.md, paddingTop: 0, gap: spacing.sm, paddingBottom: spacing.xl },
});
