import {
  addDays,
  addMonths,
  diffDays,
  monthGrid,
  startOfMonth,
  startOfWeek,
  dayMonthLabel,
  shortMonth,
  todayISO,
  weekDates,
  weekdayIndex,
} from '../dates';

describe('startOfWeek (Monday first)', () => {
  it('returns Monday for any day of the week', () => {
    expect(startOfWeek('2026-09-28')).toBe('2026-09-28'); // Mon
    expect(startOfWeek('2026-09-29')).toBe('2026-09-28'); // Tue
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28'); // Sun
  });
  it('crosses month and year boundaries', () => {
    expect(startOfWeek('2026-01-01')).toBe('2025-12-29');
    expect(startOfWeek('2026-03-01')).toBe('2026-02-23');
  });
});

describe('weekdayIndex', () => {
  it('is 0 for Monday and 6 for Sunday', () => {
    expect(weekdayIndex('2026-09-28')).toBe(0);
    expect(weekdayIndex('2026-10-04')).toBe(6);
  });
});

describe('addDays', () => {
  it('handles month ends, leap days and negative offsets', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('is not affected by DST switches', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });
});

describe('diffDays', () => {
  it('counts whole days from earlier to later', () => {
    expect(diffDays('2026-10-01', '2026-09-29')).toBe(2);
    expect(diffDays('2026-09-29', '2026-09-29')).toBe(0);
    expect(diffDays('2026-09-29', '2026-10-01')).toBe(-2);
    expect(diffDays('2027-01-01', '2026-01-01')).toBe(365);
  });
});

describe('weekDates', () => {
  it('lists seven days Monday to Sunday for the week containing the date', () => {
    expect(weekDates('2026-09-30')).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
  });
});

describe('month helpers', () => {
  it('startOfMonth and addMonths land on the first of the month', () => {
    expect(startOfMonth('2026-09-29')).toBe('2026-09-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-01');
  });
  it('monthGrid is 6 Monday-first weeks covering the month', () => {
    const grid = monthGrid('2026-09-15');
    expect(grid).toHaveLength(6);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid[0][0]).toBe('2026-08-31');
    expect(grid[5][6]).toBe('2026-10-11');
    expect(grid.flat()).toContain('2026-09-30');
  });
  it('monthGrid starts on the 1st when it is a Monday', () => {
    expect(monthGrid('2026-06-10')[0][0]).toBe('2026-06-01');
  });
});

describe('todayISO', () => {
  it('uses the local calendar date, not UTC', () => {
    expect(todayISO(new Date(2026, 8, 29, 23, 59))).toBe('2026-09-29');
    expect(todayISO(new Date(2026, 8, 30, 0, 1))).toBe('2026-09-30');
  });
});

describe('labels', () => {
  it('formats short month and day + month in the given locale', () => {
    expect(shortMonth('2026-09-29', 'en')).toBe('Sep');
    expect(dayMonthLabel('2026-09-29', 'en')).toBe('September 29');
  });
});
