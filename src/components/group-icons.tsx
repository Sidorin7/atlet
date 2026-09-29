import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = { name: string; size?: number; color: string };

// Own outline set, 24×24, 2px round stroke.
const glyphs: Record<string, (color: string) => React.ReactNode> = {
  stretch: () => (
    <>
      <Circle cx={12} cy={4.5} r={2} />
      <Path d="M12 7v6m0 0-3 7m3-7 3 7M5 4l7 4 7-4" />
    </>
  ),
  cardio: () => <Path d="M3 12h4l2.5-6 4 12 2.5-6H21" />,
  chest: () => (
    <>
      <Path d="M3 9l4-4h10l4 4-1.5 11h-15z" />
      <Path d="M12 8v7M6.5 13c3 2.5 8 2.5 11 0" />
    </>
  ),
  back: () => (
    <>
      <Path d="M3 9l4-4h10l4 4-1.5 11h-15z" />
      <Path d="M12 6v14M8 10l4 2 4-2M8.5 15l3.5 1.5 3.5-1.5" />
    </>
  ),
  arms: () => (
    <>
      <Path d="M3 19h8c3 0 5-2.5 5-6V9" />
      <Path d="M7 19c0-2.5 1.5-4 4-4" />
      <Circle cx={16} cy={6} r={3} />
    </>
  ),
  legs: () => (
    <Path d="M8 3h8l-.5 7 1 4.5-.5 6.5h-3l-.5-5.5-.5 5.5H8l-.5-6.500L8.500 10z" />
  ),
  shoulders: () => (
    <>
      <Circle cx={12} cy={6.5} r={2.5} />
      <Path d="M3 19c0-4 4-6.5 9-6.5s9 2.5 9 6.5" />
    </>
  ),
  abs: () => (
    <>
      <Rect x={6} y={3} width={12} height={18} rx={4} />
      <Path d="M12 3v18M6 9h12M6 15h12" />
    </>
  ),
  dumbbell: () => <Path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />,
  kettlebell: () => (
    <>
      <Path d="M8.5 7.5a3.5 3.5 0 0 1 7 0" />
      <Path d="M8 8h8c3 1 4 4 4 6.5 0 3-2.5 5.5-8 5.5s-8-2.5-8-5.5c0-2.5 1-5.5 4-6.5z" />
    </>
  ),
  run: () => (
    <>
      <Circle cx={15} cy={4.5} r={2} />
      <Path d="M12 9l-3 3 3 2-1 6M12 9l4 2 3 0M9 12l-4 1" />
    </>
  ),
  bolt: () => <Path d="M13 3 5 13h6l-1 8 8-10h-6z" />,
};

export const GROUP_ICON_KEYS = Object.keys(glyphs);

export function GroupIcon({ name, size = 24, color }: Props) {
  const glyph = glyphs[name] ?? glyphs.dumbbell;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {glyph(color)}
    </Svg>
  );
}
