import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Own illustration for an empty day: a resting dumbbell on a soft disc. */
export function EmptyIllustration({ disc, ink, spark }: { disc: string; ink: string; spark: string }) {
  return (
    <Svg width={220} height={180} viewBox="0 0 240 200">
      <Circle cx={120} cy={104} r={82} fill={disc} />
      <Rect x={62} y={97} width={116} height={14} rx={7} fill={ink} />
      <Rect x={46} y={68} width={22} height={72} rx={9} fill={ink} />
      <Rect x={172} y={68} width={22} height={72} rx={9} fill={ink} />
      <Rect x={30} y={84} width={14} height={40} rx={6} fill={ink} />
      <Rect x={196} y={84} width={14} height={40} rx={6} fill={ink} />
      <Path
        d="M196 34v14M189 41h14M40 44v10M35 49h10M208 150v8M204 154h8"
        stroke={spark}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}
