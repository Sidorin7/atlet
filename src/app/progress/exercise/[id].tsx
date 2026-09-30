import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { CloseButton, EmptyText, Segmented } from '@/components/ui';
import { db } from '@/db/client';
import { useLive } from '@/db/use-live';
import { monthYearLabel, shortDayLabel } from '@/lib/dates';
import { useToday } from '@/lib/use-today';
import {
  exerciseHistory,
  exerciseSeries,
  rangeStart,
  type HistoryDay,
  type ProgressRow,
  type Range,
  type SeriesPoint,
} from '@/progress/aggregate';
import { formatSetLine, formatVolume } from '@/progress/format';
import { progressRows } from '@/progress/queries';
import { useSettings } from '@/settings/provider';
import { radius, spacing, typography } from '@/theme/tokens';
import { formatNumber } from '@/workouts/numbers';

type Pick = 'primary' | 'secondary';
/** A tile above the chart; the first one is the dark line, the second the grey one. */
type Stat = { label: string; pick: Pick; format: (n: number) => string };

const CHART_HEIGHT = 200;
/** Each line is scaled to its own maximum, which sits a little below the top. */
const TOP = 100;
const CEILING = 115;

export default function ExerciseProgressScreen() {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { width } = useWindowDimensions();
  const exerciseId = Number(useLocalSearchParams<{ id: string }>().id);
  const today = useToday();
  const [range, setRange] = useState<Range>('month');

  const all = useLive(() => progressRows(db));
  const rows = useMemo(() => all.filter((r) => r.exerciseId === exerciseId), [all, exerciseId]);
  const first: ProgressRow | undefined = rows[0];
  const type = first?.type ?? 'weight';

  const from = rangeStart(today, range);
  const series = useMemo(() => exerciseSeries(rows, exerciseId, type, from), [rows, exerciseId, type, from]);
  const history = useMemo(() => exerciseHistory(rows, exerciseId, from).reverse(), [rows, exerciseId, from]);

  // The "work done" number leads: volume for weights, total reps for bodyweight, distance for cardio.
  const stats: [Stat, Stat] = {
    weight: [
      { label: t('progress.statVolume'), pick: 'secondary', format: formatVolume },
      { label: t('progress.statWeight'), pick: 'primary', format: formatNumber },
    ],
    bodyweight: [
      { label: t('progress.statTotalReps'), pick: 'secondary', format: formatVolume },
      { label: t('progress.statBestSet'), pick: 'primary', format: formatNumber },
    ],
    cardio: [
      { label: t('progress.statDistance'), pick: 'secondary', format: formatNumber },
      { label: t('progress.statTime'), pick: 'primary', format: formatNumber },
    ],
  }[type] as [Stat, Stat];

  return (
    <>
      {/* Also opened straight from a workout (swipe right on an exercise), with nothing to go back to. */}
      <Stack.Screen
        options={{
          title: first?.name ?? '',
          headerRight: () => <CloseButton label={t('common.close')} onPress={() => router.dismissTo('/')} />,
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: 'week', label: t('progress.range1w') },
            { value: 'month', label: t('progress.range1m') },
            { value: 'year', label: t('progress.range1y') },
            { value: 'all', label: t('progress.rangeAll') },
          ]}
        />

        {series.length === 0 ? (
          <EmptyText>{t('progress.noData')}</EmptyText>
        ) : (
          <DayChart key={range} points={series} stats={stats} width={width - spacing.md * 2} />
        )}

        {history.length > 0 && (
          <View style={styles.historyBlock}>
            <Text style={[typography.title, { color: colors.text }]}>{t('progress.history')}</Text>
            <HistoryColumns history={history} />
          </View>
        )}
      </ScrollView>
    </>
  );
}

/**
 * Two tiles over two overlaid lines. At rest the tiles show the best value of the period ("max");
 * while a finger is on the chart they show that day's numbers, and the badge shows its date.
 */
function DayChart({ points, stats, width }: { points: SeriesPoint[]; stats: [Stat, Stat]; width: number }) {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const today = useToday();
  const [touched, setTouched] = useState<number | null>(null);
  const point = touched !== null ? points[touched] : undefined;

  const lineColors = [colors.text, colors.textSecondary];
  const scaled = (pick: Pick) => {
    const max = Math.max(0, ...points.map((p) => p[pick]));
    return points.map((p) => ({ value: max > 0 ? (p[pick] / max) * TOP : 0 }));
  };
  // The whole period fits the width, so a drag moves the pointer instead of scrolling.
  const spacingX = points.length > 1 ? width / (points.length - 1) : width;

  return (
    <View style={styles.chartBlock}>
      <View style={styles.tiles}>
        {stats.map((s, i) => {
          const value = point ? point[s.pick] : Math.max(0, ...points.map((p) => p[s.pick]));
          return (
            <View key={s.label} style={[styles.tile, { backgroundColor: colors.surface }]}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.tileValue, { color: colors.text }]}>
                {s.format(value)}
              </Text>
              <View style={styles.tileCaption}>
                <View style={[styles.badge, { backgroundColor: lineColors[i] }]}>
                  <Text style={[styles.badgeText, { color: colors.background }]}>
                    {point ? shortDayLabel(point.date, language, today) : t('progress.statMax')}
                  </Text>
                </View>
                <Text numberOfLines={1} style={[styles.tileLabel, { color: colors.textSecondary }]}>
                  {s.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View>
        <LineChart
          data={scaled(stats[0].pick)}
          data2={scaled(stats[1].pick)}
          width={width}
          height={CHART_HEIGHT}
          maxValue={CEILING}
          noOfSections={1}
          spacing={spacingX}
          initialSpacing={0}
          endSpacing={0}
          disableScroll
          curved
          hideDataPoints
          hideDataPoints2
          hideAxesAndRules
          hideYAxisText
          yAxisLabelWidth={0}
          xAxisLabelsHeight={0}
          color={lineColors[0]}
          color2={lineColors[1]}
          thickness={2.5}
          thickness2={2}
          areaChart
          startFillColor={lineColors[0]}
          endFillColor={lineColors[0]}
          startOpacity={0.06}
          endOpacity={0.06}
          startOpacity2={0}
          endOpacity2={0}
          isAnimated={false}
          pointerConfig={{
            pointerColor: lineColors[0],
            pointer2Color: lineColors[1],
            radius: 5,
            pointerStripColor: colors.placeholder,
            pointerStripWidth: 1,
            pointerStripHeight: CHART_HEIGHT,
            activatePointersInstantlyOnTouch: true,
            pointerLabelComponent: () => null,
          }}
          getPointerProps={({ pointerIndex }: { pointerIndex: number }) =>
            setTouched(pointerIndex >= 0 && pointerIndex < points.length ? pointerIndex : null)
          }
        />
        <View style={styles.axisLabels}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {monthYearLabel(points[0].date, language)}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {monthYearLabel(points[points.length - 1].date, language)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** One column per day, oldest on the left, scrolled to the newest; each set on its own line. */
function HistoryColumns({ history }: { history: HistoryDay[] }) {
  const { t } = useTranslation();
  const { colors, language } = useSettings();
  const today = useToday();
  const units = { min: t('workout.unitMin'), km: t('workout.unitKm') };
  const scroll = useRef<ScrollView>(null);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.columns}
      ref={scroll}
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
    >
      {history.map((day) => (
        <View key={day.date} style={styles.column}>
          <Text style={[typography.body, styles.columnDate, { color: colors.textSecondary }]}>
            {shortDayLabel(day.date, language, today)}
          </Text>
          {day.sets.map((s) => (
            <Text key={s.id} style={[typography.body, { color: colors.text }]}>
              {formatSetLine(s, units)}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  chartBlock: { gap: spacing.lg },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  tileValue: { fontSize: 34, fontWeight: '800' },
  tileCaption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  tileLabel: { flexShrink: 1, fontSize: 17, fontWeight: '500' },
  axisLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  historyBlock: { gap: spacing.sm },
  columns: { gap: spacing.lg },
  column: { gap: 6, minWidth: 64 },
  columnDate: { marginBottom: 4 },
});
