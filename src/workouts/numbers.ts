const MAX = 1_000_000;

/**
 * Text field → value. `null` = field cleared, `undefined` = not a (complete) number, so the
 * caller keeps the previous value while the user is still typing something like "-".
 */
export function parseNumber(text: string, opts: { signed?: boolean } = {}): number | null | undefined {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const pattern = opts.signed ? /^[+-]?(\d+\.?\d*|\.\d+)$/ : /^(\d+\.?\d*|\.\d+)$/;
  if (!pattern.test(t)) return undefined;
  const n = Number(t);
  return Math.abs(n) < MAX ? n : undefined;
}

export function formatNumber(n: number | null | undefined, opts: { plus?: boolean } = {}): string {
  if (n === null || n === undefined) return '';
  const s = String(Math.round(n * 1000) / 1000);
  return opts.plus && n > 0 ? `+${s}` : s;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export const minutesToSeconds = (min: number | null) => (min === null ? null : Math.round(min * 60));
export const secondsToMinutes = (sec: number | null) => (sec === null ? null : round(sec / 60));
export const kmToMeters = (km: number | null) => (km === null ? null : Math.round(km * 1000));
export const metersToKm = (m: number | null) => (m === null ? null : round(m / 1000));
