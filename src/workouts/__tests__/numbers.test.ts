import { formatNumber, kmToMeters, metersToKm, minutesToSeconds, parseNumber, secondsToMinutes } from '../numbers';

describe('parseNumber', () => {
  it('parses integers and decimals, accepting a comma', () => {
    expect(parseNumber('60')).toBe(60);
    expect(parseNumber('72.5')).toBe(72.5);
    expect(parseNumber('72,5')).toBe(72.5);
    expect(parseNumber(' 8 ')).toBe(8);
  });
  it('treats an empty field as null (cleared)', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('   ')).toBeNull();
  });
  it('accepts a trailing separator while typing', () => {
    expect(parseNumber('72.')).toBe(72);
    expect(parseNumber('72,')).toBe(72);
  });
  it('returns undefined for text that is not a number yet or ever', () => {
    expect(parseNumber('abc')).toBeUndefined();
    expect(parseNumber('1.2.3')).toBeUndefined();
    expect(parseNumber('-')).toBeUndefined();
    expect(parseNumber('+')).toBeUndefined();
    expect(parseNumber('.')).toBeUndefined();
  });
  it('handles signs for bodyweight load only when allowed', () => {
    expect(parseNumber('+10', { signed: true })).toBe(10);
    expect(parseNumber('-20', { signed: true })).toBe(-20);
    expect(parseNumber('-20')).toBeUndefined();
    expect(parseNumber('+10')).toBeUndefined();
  });
  it('rejects values that make no sense as a workout number', () => {
    expect(parseNumber('1e5')).toBeUndefined();
    expect(parseNumber('99999999')).toBeUndefined();
  });
});

describe('formatNumber', () => {
  it('renders null as empty and drops trailing zeros', () => {
    expect(formatNumber(null)).toBe('');
    expect(formatNumber(60)).toBe('60');
    expect(formatNumber(72.5)).toBe('72.5');
    expect(formatNumber(-20)).toBe('-20');
  });
  it('round-trips through parseNumber', () => {
    for (const n of [0, 5, 72.5, 100.25, -20]) {
      expect(parseNumber(formatNumber(n), { signed: true })).toBe(n);
    }
  });
  it('shows a positive load with a plus when asked', () => {
    expect(formatNumber(10, { plus: true })).toBe('+10');
    expect(formatNumber(0, { plus: true })).toBe('0');
    expect(formatNumber(-20, { plus: true })).toBe('-20');
  });
});

describe('cardio units', () => {
  it('converts minutes and seconds', () => {
    expect(minutesToSeconds(30)).toBe(1800);
    expect(minutesToSeconds(12.5)).toBe(750);
    expect(minutesToSeconds(null)).toBeNull();
    expect(secondsToMinutes(750)).toBe(12.5);
    expect(secondsToMinutes(null)).toBeNull();
  });
  it('converts kilometres and metres', () => {
    expect(kmToMeters(5)).toBe(5000);
    expect(kmToMeters(2.4)).toBe(2400);
    expect(kmToMeters(null)).toBeNull();
    expect(metersToKm(2400)).toBe(2.4);
    expect(metersToKm(null)).toBeNull();
  });
});
