import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayISO, type ISODate } from './dates';

/** Today's date, refreshed whenever the app returns to the foreground (e.g. after midnight). */
export function useToday(): ISODate {
  const [today, setToday] = useState(() => todayISO());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(todayISO());
    });
    return () => sub.remove();
  }, []);
  return today;
}
