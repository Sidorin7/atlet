const DAY_MS = 86_400_000;

function expirationDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** Calendar days in the current time zone; the deadline itself never moves. */
export function renewalState(expiration: string | null, now = new Date()) {
  const deadline = expirationDate(expiration);
  if (!deadline) return null;
  const calendarDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.max(0, Math.round((calendarDay(deadline) - calendarDay(now)) / DAY_MS));
  return { days, urgent: days <= 2 };
}

export function reminderDates(expiration: string | null, now = new Date()) {
  const deadline = expirationDate(expiration);
  if (!deadline) return [];
  return [2, 1].flatMap((days) => {
    const fire = new Date(deadline);
    fire.setDate(fire.getDate() - days);
    fire.setHours(19, 0, 0, 0);
    return fire > now && fire < deadline
      ? [{ id: `atlet.signature.${days}`, timestamp: fire.getTime() }]
      : [];
  });
}
