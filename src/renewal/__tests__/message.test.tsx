import { fireEvent, render, screen } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { RenewalMessage } from '../message';

jest.mock('@/settings/provider', () => ({
  useSettings: () => ({ language: 'ru', colors: { surface: '#eee', text: '#000', textSecondary: '#666', danger: '#f00' } }),
}));

beforeAll(() => initI18n('ru'));

it('shows the deadline and an actionable recovery when notifications are denied', async () => {
  const recover = jest.fn();
  await render(<RenewalMessage expiration="2026-11-14T10:27:23Z" now={new Date('2026-11-12T10:00:00Z')} status="disabled" onEnable={recover} />);
  expect(screen.getByText('Обновить до 14.11')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Разрешить уведомления' }));
  expect(recover).toHaveBeenCalledTimes(1);
});

it('keeps scheduling failures visible and offers retry', async () => {
  const retry = jest.fn();
  await render(<RenewalMessage expiration="2026-11-14T10:27:23Z" now={new Date('2026-11-12T10:00:00Z')} status="error" onEnable={retry} />);
  expect(screen.getByText('Не удалось настроить уведомления')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Попробовать снова' }));
  expect(retry).toHaveBeenCalledTimes(1);
});

it('does not show a guessed deadline on builds without a development profile', async () => {
  await render(<RenewalMessage expiration={null} now={new Date()} status="unavailable" onEnable={() => {}} />);
  expect(screen.queryByText(/Обновите Atlet/)).toBeNull();
});
