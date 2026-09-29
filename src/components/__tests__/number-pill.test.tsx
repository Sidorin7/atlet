import { fireEvent, render, screen } from '@testing-library/react-native';

import { NumberPill } from '../number-pill';

jest.mock('@/settings/provider', () => ({
  useColors: () => ({ surface: '#eee', text: '#000', textSecondary: '#888', placeholder: '#bbb' }),
}));

const setup = async (props: Partial<React.ComponentProps<typeof NumberPill>> = {}) => {
  const onCommit = jest.fn();
  const utils = await render(
    <NumberPill value={null} ghost={null} unit="кг" keyboard="decimal-pad" onCommit={onCommit} {...props} />,
  );
  return { onCommit, input: screen.getByLabelText('кг'), ...utils };
};

describe('NumberPill', () => {
  it('commits parsed numbers, accepting a comma', async () => {
    const { input, onCommit } = await setup();
    await fireEvent.changeText(input, '72,5');
    expect(onCommit).toHaveBeenLastCalledWith(72.5);
  });

  it('commits null when the field is cleared', async () => {
    const { input, onCommit } = await setup({ value: 60 });
    await fireEvent.changeText(input, '');
    expect(onCommit).toHaveBeenLastCalledWith(null);
  });

  it('does not commit or reset text while a signed number is half typed', async () => {
    const { input, onCommit, rerender } = await setup({ value: null, signed: true, keyboard: 'numbers-and-punctuation' });
    await fireEvent.changeText(input, '-');
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.props.value).toBe('-');
    await rerender(
      <NumberPill value={null} ghost={null} unit="кг" keyboard="numbers-and-punctuation" signed onCommit={onCommit} />,
    );
    expect(screen.getByLabelText('кг').props.value).toBe('-');
    await fireEvent.changeText(screen.getByLabelText('кг'), '-20');
    expect(onCommit).toHaveBeenLastCalledWith(-20);
  });

  it('ignores garbage without committing', async () => {
    const { input, onCommit } = await setup();
    await fireEvent.changeText(input, 'abc');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('keeps a trailing separator the user just typed', async () => {
    const { input, onCommit, rerender } = await setup();
    await fireEvent.changeText(input, '72.');
    expect(onCommit).toHaveBeenLastCalledWith(72);
    await rerender(<NumberPill value={72} ghost={null} unit="кг" keyboard="decimal-pad" onCommit={onCommit} />);
    expect(screen.getByLabelText('кг').props.value).toBe('72.');
  });

  it('shows an outside change, such as tap-to-fill from last time', async () => {
    const { rerender, onCommit } = await setup({ value: null, ghost: 60 });
    expect(screen.getByLabelText('кг').props.placeholder).toBe('60');
    await rerender(<NumberPill value={60} ghost={60} unit="кг" keyboard="decimal-pad" onCommit={onCommit} />);
    expect(screen.getByLabelText('кг').props.value).toBe('60');
  });

  it('shows the unit as placeholder when there is no ghost', async () => {
    await setup();
    expect(screen.getByLabelText('кг').props.placeholder).toBe('кг');
  });

  it('shows a positive bodyweight load with a plus', async () => {
    await setup({ value: 10, signed: true, keyboard: 'numbers-and-punctuation' });
    expect(screen.getByLabelText('кг').props.value).toBe('+10');
  });
});
