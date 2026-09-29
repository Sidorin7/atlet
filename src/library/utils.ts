export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from === to || from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');

export function filterExercises<T extends { name: string }>(items: readonly T[], query: string): T[] {
  const q = normalize(query);
  if (!q) return [...items];
  return items.filter((e) => normalize(e.name).includes(q));
}
