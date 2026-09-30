import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { GroupIcon } from '@/components/group-icons';
import { CloseButton, EmptyText, ListRow, Segmented } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { diffDays, shortDayLabel, startOfMonth, startOfWeek } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import {
  exerciseTrends,
  groupBalance,
  heatmapWeeks,
  recentRecords,
  trainingDays,
  weekStreak,
  workoutsInLast,
  type ProgressRow,
} from '@/progress/aggregate';
import { formatChange, formatScore, formatSetLine } from '@/progress/format';
import { allGroups, progressRows } from '@/progress/queries';
import { useSettings } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';

const HEATMAP_WEEKS = 16;
const RECORDS = 5;
const CELL_GAP = 3;

export default function ProgressScreen() {
  const { t } = useTranslation();
  const rows = useLive(() => progressRows(db));

  const close = (
    <Stack.Screen
      options={{
        headerRight: () => <CloseButton label={t('common.close')} onPress={() => router.dismissTo('/')} />,
      }}
    />
  );

  if (rows.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        {close}
        <EmptyText>{t('progress.empty')}</EmptyText>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {close}
      <Consistency rows={rows} />
      <Records rows={rows} />
      <Balance rows={rows} />
      <Trends rows={rows} />
    </ScrollView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const { colors } = useSettings();
  return (
    <View style={styles.section}>
      <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
      {hint && <Text style={[typography.caption, { color: colors.textSecondary }]}>{hint}</Text>}
      {children}
    </View>
  );
}

const useUnits = () => {
  const { t } = useTranslation();
  return { min: t('workout.unitMin'), km: t('workout.unitKm'), kg: t('workout.unitKg') };
};

/** Training days of the last 16 weeks as a grid (a column per week, Monday on top), plus two numbers. */
function Consistency({ rows }: { rows: ProgressRow[] }) {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { width } = useWindowDimensions();
  const today = useToday();
  const days = useMemo(() => trainingDays(rows), [rows]);
  const weeks = useMemo(() => heatmapWeeks(days, today, HEATMAP_WEEKS), [days, today]);
  const streak = weekStreak(days, today);
  const last30 = workoutsInLast(days, today, 30);

  const inner = width - spacing.md * 4;
  const cell = Math.floor((inner - CELL_GAP * (HEATMAP_WEEKS - 1)) / HEATMAP_WEEKS);

  return (
    <Section title={t('progress.consistency')}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.grid}>
          {weeks.map((week) => (
            <View key={week[0].date} style={styles.gridColumn}>
              {week.map((d) => (
                <View
                  key={d.date}
                  style={[
                    { width: cell, height: cell, borderRadius: cell / 4 },
                    { backgroundColor: d.trained ? colors.text : colors.background, opacity: d.future ? 0.35 : 1 },
                    d.date === today && { borderWidth: 1.5, borderColor: colors.textSecondary },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={styles.figures}>
          <Text style={[typography.body, styles.figure, { color: colors.text }]}>
            {t('progress.weekStreak', { count: streak })}
          </Text>
          <Text style={[typography.body, styles.figure, { color: colors.textSecondary }]}>
            {t('progress.last30', { count: last30 })}
          </Text>
        </View>
      </View>
    </Section>
  );
}

function Records({ rows }: { rows: ProgressRow[] }) {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const today = useToday();
  const units = useUnits();
  const records = useMemo(() => recentRecords(rows, RECORDS), [rows]);

  return (
    <Section title={t('progress.records')}>
      {records.length === 0 && (
        <Text style={[typography.body, { color: colors.textSecondary }]}>{t('progress.noRecords')}</Text>
      )}
      <View style={styles.list}>
        {records.map((r) => (
          <ListRow
            key={r.row.id}
            left={<GroupIcon name={r.row.groupIcon} color={colors.text} />}
            title={r.row.name}
            subtitle={`${shortDayLabel(r.date, language, today)} · ${t('progress.was', { value: formatScore(r.previous, units) })}`}
            right={<Text style={[typography.body, { color: colors.text }]}>{formatSetLine(r.row, units)}</Text>}
            onPress={() => openExercise(r.row.exerciseId)}
          />
        ))}
      </View>
    </Section>
  );
}

type Period = 'week' | 'month';

/** Sets per muscle group this week or month, and how long since each group was trained. */
function Balance({ rows }: { rows: ProgressRow[] }) {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const today = useToday();
  const [period, setPeriod] = useState<Period>('week');
  const groups = useLive(() => allGroups(db));
  const from = period === 'week' ? startOfWeek(today) : startOfMonth(today);
  const loads = useMemo(() => groupBalance(rows, groups, from), [rows, groups, from]);
  const max = Math.max(1, ...loads.map((l) => l.sets));

  const since = (date: string | null) => {
    if (date === null) return t('progress.never');
    const n = diffDays(today, date);
    return n <= 0 ? t('progress.todayShort') : t('progress.daysAgo', { count: n });
  };

  return (
    <Section title={t('progress.balance')}>
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'week', label: t('progress.range1w') },
          { value: 'month', label: t('progress.range1m') },
        ]}
      />
      <View style={[styles.card, styles.balance, { backgroundColor: colors.surface }]}>
        {loads.map(({ group, sets, lastDate }) => (
          <View key={group.id} style={styles.balanceRow}>
            <GroupIcon name={group.icon} size={22} color={sets > 0 ? colors.text : colors.textSecondary} />
            <View style={styles.balanceMain}>
              <View style={styles.balanceLine}>
                <Text numberOfLines={1} style={[typography.body, styles.balanceName, { color: colors.text }]}>
                  {group.name}
                </Text>
                <Text style={[typography.caption, { color: colors.text }]}>
                  {t('progress.setsCount', { count: sets })}
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.background }]}>
                {sets > 0 && (
                  <View style={[styles.fill, { width: `${(sets / max) * 100}%`, backgroundColor: colors.text }]} />
                )}
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{since(lastDate)}</Text>
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
}

/** Every exercise with its best recent set and the change against the 4 weeks before. */
function Trends({ rows }: { rows: ProgressRow[] }) {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const today = useToday();
  const units = useUnits();
  const trends = useMemo(() => exerciseTrends(rows, today), [rows, today]);

  return (
    <Section title={t('progress.trends')} hint={t('progress.trendHint')}>
      <View style={styles.list}>
        {trends.map((tr) => {
          const label =
            tr.change === null ? '' : tr.change === 'new' ? t('progress.trendNew') : formatChange(tr.change);
          const strong = typeof tr.change === 'number' && tr.change !== 0;
          return (
            <ListRow
              key={tr.exerciseId}
              left={<GroupIcon name={tr.groupIcon} color={tr.change === null ? colors.textSecondary : colors.text} />}
              title={tr.name}
              subtitle={formatScore(tr.best, units)}
              right={
                label ? (
                  <Text style={[typography.body, { color: strong ? colors.text : colors.textSecondary }]}>{label}</Text>
                ) : undefined
              }
              chevron
              onPress={() => openExercise(tr.exerciseId)}
            />
          );
        })}
      </View>
    </Section>
  );
}

const openExercise = (id: number) =>
  router.push({ pathname: '/progress/exercise/[id]', params: { id: String(id) } });

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.xl, paddingBottom: spacing.xl },
  emptyWrap: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  section: { gap: spacing.sm },
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  gridColumn: { gap: CELL_GAP },
  figures: { gap: 2 },
  figure: { fontWeight: '600' },
  list: { gap: spacing.sm },
  balance: { gap: spacing.md },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  balanceMain: { flex: 1, gap: 4 },
  balanceLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  balanceName: { flex: 1 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
