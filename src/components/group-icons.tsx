import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

type Props = { name: string; size?: number; color: string };

// Own filled set, 24×24: solid muscle silhouettes; figures use a thick round stroke with a solid head.
const MIRROR = 'translate(24 0) scale(-1 1)';

const glyphs: Record<string, (color: string) => React.ReactNode> = {
  stretch: (c) => (
    <>
      <Circle cx={8} cy={5.5} r={2.3} fill={c} stroke="none" />
      <Path strokeWidth={2.6} d="M10 8c2 2 3 4 3 6.5M13 14.5 10 21M13 14.5 16.5 21M11.5 9.5C13 6.5 15.5 4 19 3.5" />
    </>
  ),
  cardio: (c) => (
    <Path fill={c} stroke="none" d="M12 21S3 16 3 9.3A5 5 0 0 1 12 6.3a5 5 0 0 1 9 3C21 16 12 21 12 21z" />
  ),
  // Two pecs.
  chest: (c) => (
    <Path
      fill={c}
      stroke="none"
      d="M11.2 6.3C9 5.2 5.8 5 3.6 6.4c-1.2 3.3-.2 7.4 3.2 8.6 2 .7 3.6.1 4.4-1.1zM12.8 6.3C15 5.2 18.2 5 20.4 6.4c1.2 3.3.2 7.4-3.2 8.6-2 .7-3.6.1-4.4-1.1z"
    />
  ),
  // Seen from behind: head, V-shaped lats, the spine as a gap.
  back: (c) => {
    const half = 'M11.2 7.2 8.8 6.6c-2 .2-3.8.8-5 2 .6 2.4 1.8 4.4 3.2 6.2L8.4 21.5h2.8z';
    return (
      <G fill={c} stroke="none">
        <Circle cx={12} cy={3.2} r={2.2} />
        <Path d={half} />
        <Path d={half} transform={MIRROR} />
      </G>
    );
  },
  // Flexed biceps.
  arms: (c) => (
    <Path
      fill={c}
      stroke="none"
      d="M3 21h10c4.3 0 7.8-2.8 7.8-7.2 0-3-2.4-4.8-5.3-4.1-1.4.3-2.4 1.2-3 2.3l-1.2-1L13.8 6l-2.2-3.4-4 1.3 1 2.8L5.8 11C4 14 3 17.5 3 21z"
    />
  ),
  // A leg in profile: quad, knee, calf, foot.
  legs: (c) => (
    <Path
      fill={c}
      stroke="none"
      d="M7 2.5h7.2c1.6 2.4 2 5.2 1 8l-1.6 2.6.8 6.4 4.6 1.8V22h-9l-.4-3c-1.4-2-1.6-4.4-.4-6.6L7.6 10C6.8 7.5 6.6 5 7 2.5z"
    />
  ),
  // Round delts on both sides.
  shoulders: (c) => (
    <G fill={c} stroke="none">
      <Circle cx={12} cy={4.8} r={2.6} />
      <Circle cx={5.5} cy={12.3} r={3.4} />
      <Circle cx={18.5} cy={12.3} r={3.4} />
      <Path d="M8.8 9.6h6.4a1 1 0 0 1 1 1V21H7.8V10.6a1 1 0 0 1 1-1z" />
    </G>
  ),
  // Six-pack.
  abs: (c) => (
    <G fill={c} stroke="none">
      {[2.8, 9.3, 15.8].map((y) =>
        [5.8, 12.8].map((x) => <Rect key={`${x}-${y}`} x={x} y={y} width={5.4} height={5.4} rx={1.6} />),
      )}
    </G>
  ),
  dumbbell: (c) => (
    <G fill={c} stroke="none">
      <Rect x={2} y={8.5} width={3} height={7} rx={1} />
      <Rect x={5.5} y={5.5} width={3.5} height={13} rx={1.2} />
      <Rect x={8.5} y={10.8} width={7} height={2.4} />
      <Rect x={15} y={5.5} width={3.5} height={13} rx={1.2} />
      <Rect x={19} y={8.5} width={3} height={7} rx={1} />
    </G>
  ),
  kettlebell: (c) => (
    <>
      <Path strokeWidth={2.6} d="M8 9V7.5a4 4 0 0 1 8 0V9" />
      <Path
        fill={c}
        stroke="none"
        d="M6.5 9h11c2 1.5 3 3.8 3 6.3 0 3.3-3 5.7-8.5 5.7s-8.5-2.4-8.5-5.7C3.5 12.8 4.5 10.5 6.5 9z"
      />
    </>
  ),
  run: (c) => (
    <>
      <Circle cx={15} cy={4.5} r={2.3} fill={c} stroke="none" />
      <Path strokeWidth={2.6} d="M12 9l-3 3 3 2-1 6M12 9l4 2h3M9 12l-4 1" />
    </>
  ),
  bolt: (c) => <Path fill={c} stroke="none" d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.5z" />,
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
