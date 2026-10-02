import { addDatabaseChangeListener } from 'expo-sqlite';
import { useState, useSyncExternalStore, type DependencyList } from 'react';

import { queryTables } from './query-tables';

function liveQuery<T>(build: () => { all(): T[] }) {
  const query = build();
  const watched = new Set(queryTables(query).map((t) => t.name));
  let data = query.all();
  return {
    get: () => data,
    subscribe(onChange: () => void) {
      // Catch writes that landed between the first read and subscribing.
      data = query.all();
      const sub = addDatabaseChangeListener(({ tableName }) => {
        if (!watched.has(tableName)) return;
        data = query.all();
        onChange();
      });
      return () => sub.remove();
    },
  };
}

const sameDeps = (a: DependencyList, b: DependencyList) =>
  a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

/** Re-runs a select whenever any table it reads (main or joined) changes. `deps` are the query's inputs. */
export function useLive<T>(build: () => { all(): T[] }, deps: DependencyList = []): T[] {
  const [live, setLive] = useState(() => ({ deps, store: liveQuery(build) }));
  let current = live;
  if (!sameDeps(live.deps, deps)) {
    current = { deps, store: liveQuery(build) };
    setLive(current);
  }
  return useSyncExternalStore(current.store.subscribe, current.store.get);
}
