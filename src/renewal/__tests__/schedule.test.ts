import { renewalState, reminderDates } from '../schedule';

describe('personal build renewal', () => {
  const expiry = '2026-11-14T13:27:23+03:00';

  it('uses the real expiration and keeps it unchanged across launches', () => {
    expect(renewalState(expiry, new Date('2026-11-07T14:00:00+03:00'))).toEqual({ days: 7, urgent: false });
    expect(renewalState(expiry, new Date('2026-11-12T14:00:00+03:00'))).toEqual({ days: 2, urgent: true });
  });

  it('schedules the two previous calendar days at local 19:00', () => {
    const expiration = new Date(2026, 10, 14, 13, 27, 23).toISOString();
    expect(reminderDates(expiration, new Date(2026, 10, 7))).toEqual([
      { id: 'atlet.signature.2', timestamp: new Date(2026, 10, 12, 19).getTime() },
      { id: 'atlet.signature.1', timestamp: new Date(2026, 10, 13, 19).getTime() },
    ]);
  });

  it('never schedules past slots or reminders after expiration', () => {
    const expiration = new Date(2026, 10, 14, 13).toISOString();
    expect(reminderDates(expiration, new Date(2026, 10, 12, 20))).toEqual([
      { id: 'atlet.signature.1', timestamp: new Date(2026, 10, 13, 19).getTime() },
    ]);
    expect(reminderDates(expiration, new Date(2026, 10, 14, 10))).toEqual([]);
    expect(renewalState(expiration, new Date(2026, 10, 14, 14))).toEqual({ days: 0, urgent: true });
  });

  it('does not invent dates for unsupported or malformed profiles', () => {
    for (const expiry of [null, '', 'bad date']) {
      expect(renewalState(expiry)).toBeNull();
      expect(reminderDates(expiry)).toEqual([]);
    }
  });

  it('resets dates for a new signed build without changing reminder identities', () => {
    const now = new Date(2026, 10, 7);
    expect(reminderDates(new Date(2026, 10, 18, 13).toISOString(), now)).toEqual([
      { id: 'atlet.signature.2', timestamp: new Date(2026, 10, 16, 19).getTime() },
      { id: 'atlet.signature.1', timestamp: new Date(2026, 10, 17, 19).getTime() },
    ]);
  });
});
