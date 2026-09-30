import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GroupIcon } from '@/components/group-icons';
import { PlusIcon } from '@/components/icons';
import {
  AddMark,
  Button,
  CloseButton,
  EmptyText,
  GradientCard,
  ListRow,
  Segmented,
  TextField,
} from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { dayMonthLabel } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import { allExercises, groupsWithCounts, programsWithCounts } from '@/library/queries';
import { useAddToDay } from '@/library/use-add-to-day';
import { filterExercises } from '@/library/utils';
import { useSettings } from '@/settings/provider';
import { spacing, typography } from '@/theme/tokens';

type Tab = 'exercises' | 'programs';

const editExercise = (id: number) =>
  router.push({ pathname: '/library/exercise-edit', params: { id: String(id) } });

export default function LibraryHome() {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const today = useToday();
  const { date, tab: initialTab } = useLocalSearchParams<{ date?: string; tab?: Tab }>();
  const { counts, total, add } = useAddToDay(date);
  const [tab, setTab] = useState<Tab>(initialTab === 'programs' ? 'programs' : 'exercises');
  const [query, setQuery] = useState('');

  const groups = useLive(() => groupsWithCounts(db));
  const exercises = useLive(() => allExercises(db));
  const programs = useLive(() => programsWithCounts(db));

  const q = query.trim();
  const found = useMemo(() => filterExercises(exercises, q), [exercises, q]);
  const foundPrograms = useMemo(() => filterExercises(programs, q), [programs, q]);

  return (
    <View style={styles.flex}>
      {/* The iOS form sheet sizes the list itself and only leaves room for a header it can see as one
          view; without collapsable={false} this View is flattened away and the list covers the tabs. */}
      <View style={styles.top} collapsable={false}>
        {date && (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {t('library.target', {
              day: date === today ? t('common.today') : dayMonthLabel(date, language),
            })}
          </Text>
        )}
        <View style={styles.searchRow}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder={t('library.search')}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={styles.search}
          />
          <CloseButton label={t('common.close')} onPress={() => router.dismissTo('/')} />
        </View>
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
                  router.push({ pathname: '/library/group/[id]', params: { id: String(g.id), date } })
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
                right={date ? <AddMark count={counts.get(e.id)} /> : undefined}
                onPress={() => (add(e.id) ? undefined : editExercise(e.id))}
                onLongPress={() => editExercise(e.id)}
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
                count={p.exerciseCount}
                countLabel={t('library.exerciseCount', { count: p.exerciseCount })}
                onPress={() =>
                  router.push({ pathname: '/library/program/[id]', params: { id: String(p.id), date } })
                }
              />
            ))}
            {foundPrograms.length === 0 && (
              <EmptyText>{q === '' ? t('library.emptyPrograms') : t('library.noResults')}</EmptyText>
            )}
          </>
        )}
      </ScrollView>
      {total > 0 && (
        <View style={styles.footer}>
          <Button title={t('library.addedDone', { count: total })} onPress={() => router.dismissTo('/')} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search: { flex: 1 },
  top: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md },
  list: { padding: spacing.md, paddingTop: 0, gap: spacing.sm, paddingBottom: spacing.xl },
  footer: { padding: spacing.md, paddingBottom: spacing.lg },
});
