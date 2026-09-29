import { useSyncExternalStore } from 'react';

import type { ProgramColor } from '@/theme/tokens';

export type ProgramDraft = { name: string; color: ProgramColor; exerciseIds: number[] };

export const emptyDraft = (): ProgramDraft => ({ name: '', color: 'pink', exerciseIds: [] });

// The exercise picker is a separate screen; the draft lives here so it survives the round-trip.
let draft: ProgramDraft = emptyDraft();
const listeners = new Set<() => void>();

export const programDraft = {
  get: () => draft,
  set(patch: Partial<ProgramDraft>) {
    draft = { ...draft, ...patch };
    listeners.forEach((l) => l());
  },
  reset(next: ProgramDraft = emptyDraft()) {
    draft = next;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useProgramDraft = () => useSyncExternalStore(programDraft.subscribe, programDraft.get);
