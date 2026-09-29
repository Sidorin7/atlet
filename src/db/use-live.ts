import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState, type DependencyList } from 'react';

import { queryTables } from './query-tables';

/** Re-runs a select whenever any table it reads (main or joined) changes. `deps` are the query's inputs. */
export function useLive<T>(build: () => { all(): T[] }, deps: DependencyList = []): T[] {
  const [data, setData] = useState<T[]>(() => build().all());

  useEffect(() => {
    const query = build();
    const watched = new Set(queryTables(query).map((t) => t.name));
    setData(query.all());
    const sub = addDatabaseChangeListener(({ tableName }) => {
      if (watched.has(tableName)) setData(query.all());
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}
