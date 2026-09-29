import { useEffect, useMemo, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  addDays,
  dayNumber,
  diffDays,
  isSameMonth,
  monthGrid,
  startOfWeek,
  weekDates,
  weekdayLabels,
  type ISODate,
} from '@/lib/dates';
import { useColors } from '@/settings/provider';
import { typography } from '@/theme/tokens';

/** date → 'done' (has a filled set) | 'planned' (workout exists, nothing filled yet) */
export type Marks = ReadonlyMap<ISODate, 'done' | 'planned'>;

type DayProps = {
  date: ISODate;
  selected: boolean;
  today: boolean;
  mark?: 'done' | 'planned';
  dimmed?: boolean;
  onPress: (date: ISODate) => void;
};

function DayCell({ date, selected, today, mark, dimmed, onPress }: DayProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => onPress(date)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={styles.cell}
    >
      <View
        style={[
          styles.circle,
          selected && { backgroundColor: colors.accent },
          !selected && mark === 'done' && { borderWidth: 2, borderColor: colors.accent },
        ]}
      >
        <Text
          style={[
            typography.body,
            { color: selected ? colors.onAccent : dimmed ? colors.placeholder : colors.text },
          ]}
        >
          {dayNumber(date)}
        </Text>
      </View>
      <View
        style={[
          styles.dot,
          today
            ? { backgroundColor: colors.danger }
            : mark === 'planned' && !selected
              ? { backgroundColor: colors.textSecondary }
              : null,
        ]}
      />
    </Pressable>
  );
}

function WeekdayRow({ locale }: { locale: string }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      {weekdayLabels(locale).map((label, i) => (
        <Text key={i} style={[typography.caption, styles.weekday, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ))}
    </View>
  );
}

const WEEKS_BEFORE = 104;
const WEEKS_AFTER = 52;
const PAGE_COUNT = WEEKS_BEFORE + WEEKS_AFTER + 1;

/** Swipeable Monday–Sunday strip. Swiping to another week keeps the weekday selected. */
export function WeekStrip({
  selected,
  today,
  marks,
  locale,
  onSelect,
}: {
  selected: ISODate;
  today: ISODate;
  marks: Marks;
  locale: string;
  onSelect: (date: ISODate) => void;
}) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const baseWeek = useMemo(() => addDays(startOfWeek(today), -7 * WEEKS_BEFORE), [today]);
  const pages = useMemo(() => Array.from({ length: PAGE_COUNT }, (_, i) => i), []);

  const pageOf = (date: ISODate) => diffDays(startOfWeek(date), baseWeek) / 7;
  const selectedPage = pageOf(selected);
  const currentPage = useRef(selectedPage);

  useEffect(() => {
    if (selectedPage === currentPage.current) return;
    if (selectedPage < 0 || selectedPage >= PAGE_COUNT) return;
    currentPage.current = selectedPage;
    listRef.current?.scrollToIndex({ index: selectedPage, animated: true });
  }, [selectedPage]);

  return (
    <View>
      <WeekdayRow locale={locale} />
      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.min(Math.max(selectedPage, 0), PAGE_COUNT - 1)}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        windowSize={3}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / width);
          if (page === currentPage.current) return;
          currentPage.current = page;
          onSelect(addDays(selected, (page - selectedPage) * 7));
        }}
        renderItem={({ item }) => (
          <View style={[styles.row, { width }]}>
            {weekDates(addDays(baseWeek, item * 7)).map((date) => (
              <DayCell
                key={date}
                date={date}
                selected={date === selected}
                today={date === today}
                mark={marks.get(date)}
                onPress={onSelect}
              />
            ))}
          </View>
        )}
      />
    </View>
  );
}

/** Six-week month grid; days of neighbouring months are dimmed but selectable. */
export function MonthGrid({
  month,
  selected,
  today,
  marks,
  locale,
  onSelect,
}: {
  month: ISODate;
  selected: ISODate;
  today: ISODate;
  marks: Marks;
  locale: string;
  onSelect: (date: ISODate) => void;
}) {
  return (
    <View>
      <WeekdayRow locale={locale} />
      {monthGrid(month).map((week) => (
        <View key={week[0]} style={styles.row}>
          {week.map((date) => (
            <DayCell
              key={date}
              date={date}
              selected={date === selected}
              today={date === today}
              mark={marks.get(date)}
              dimmed={!isSameMonth(date, month)}
              onPress={onSelect}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 8 },
  weekday: { flex: 1, textAlign: 'center', paddingBottom: 4 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2, gap: 2 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
