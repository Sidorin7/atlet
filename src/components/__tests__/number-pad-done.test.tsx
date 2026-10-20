import { fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { NumberPadDone, NumberPill } from '../number-pill';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/settings/provider', () => ({
  useColors: () => ({ surface: '#eee', text: '#000', textSecondary: '#888', placeholder: '#bbb' }),
}));

// Reanimated has no keyboard in Jest, so the tests set its height themselves.
let mockKeyboardHeight = 0;
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    useAnimatedKeyboard: () => ({ height: { get: () => mockKeyboardHeight, value: mockKeyboardHeight } }),
  };
});

/** Native component names anywhere in the rendered tree. */
const hostTypes = (node: unknown): string[] => {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(hostTypes);
  const { type, children } = node as { type: string; children?: unknown };
  return [type, ...hostTypes(children)];
};

// Reanimated's types describe the native stub; under Jest it takes an element and returns its style.
const animatedStyle = getAnimatedStyle as unknown as (el: unknown) => { transform?: { translateY: number }[] };
const barShift = () => animatedStyle(screen.getByTestId('number-pad-done')).transform?.[0]?.translateY;

describe('NumberPadDone', () => {
  beforeEach(() => {
    mockKeyboardHeight = 0;
  });

  // On React Native 0.88 the deprecated InputAccessoryView left its grey background inside the
  // workout, covering the title card. The bar must not be built on it.
  it('does not use the deprecated InputAccessoryView', async () => {
    await render(<NumberPadDone />);
    expect(hostTypes(screen.toJSON())).not.toContain('RCTInputAccessoryView');
  });

  it('waits below the screen while the keyboard is closed', async () => {
    await render(<NumberPadDone />);
    expect(barShift()).toBeGreaterThan(0);
  });

  it('sits right on top of an open keyboard', async () => {
    mockKeyboardHeight = 300;
    await render(<NumberPadDone />);
    expect(barShift()).toBe(-300);
  });

  it('closes the keyboard from its Done button', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    await render(<NumberPadDone />);
    await fireEvent.press(screen.getByRole('button', { name: 'common.done' }));
    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });
});

describe('NumberPill', () => {
  it('is not tied to a keyboard accessory view', async () => {
    await render(<NumberPill value={null} ghost={null} unit="кг" keyboard="decimal-pad" onCommit={() => {}} />);
    expect(screen.getByLabelText('кг').props.inputAccessoryViewID).toBeUndefined();
  });
});
