import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { updateSet } from '@/workouts/repo';

import { SetRow } from '../set-row';

jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/workouts/repo', () => ({ updateSet: jest.fn(), deleteSet: jest.fn() }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: {} }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/settings/provider', () => ({
  useColors: () => ({ surface: '#eee', text: '#000', textSecondary: '#888', placeholder: '#bbb', background: '#fff' }),
}));
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const { View } = jest.requireActual('react-native');
  return function Swipeable({ children }: { children: React.ReactNode }) {
    return <View>{children}</View>;
  };
});

const empty = { id: 7, workoutExerciseId: 1, position: 1, weightKg: null, reps: null, durationSec: null, distanceM: null };
const ghost = { ...empty, id: 6, position: 0, weightKg: 60, reps: 10 };

describe('SetRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(updateSet).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('fills the grey numbers when the user leaves the row without typing', async () => {
    await render(<SetRow set={empty} index={1} type="weight" ghost={ghost} />);
    const kg = screen.getByLabelText('workout.unitKg');
    await fireEvent(kg, 'focus');
    await fireEvent(kg, 'blur');
    await act(() => jest.runAllTimers());
    expect(updateSet).toHaveBeenCalledWith({}, 7, { weightKg: 60, reps: 10 });
  });

  it('keeps what the user typed and fills only the untouched field', async () => {
    const typed = { ...empty, weightKg: 65 };
    await render(<SetRow set={typed} index={1} type="weight" ghost={ghost} />);
    const kg = screen.getByLabelText('workout.unitKg');
    await fireEvent(kg, 'focus');
    await fireEvent(kg, 'blur');
    await act(() => jest.runAllTimers());
    expect(updateSet).toHaveBeenCalledWith({}, 7, { reps: 10 });
  });

  it('does not fill while moving between the two fields of the row', async () => {
    await render(<SetRow set={empty} index={1} type="weight" ghost={ghost} />);
    const kg = screen.getByLabelText('workout.unitKg');
    const reps = screen.getByLabelText('workout.unitReps');
    await fireEvent(kg, 'focus');
    await fireEvent(kg, 'blur');
    await fireEvent(reps, 'focus');
    await act(() => jest.runAllTimers());
    expect(updateSet).not.toHaveBeenCalled();
  });
});
