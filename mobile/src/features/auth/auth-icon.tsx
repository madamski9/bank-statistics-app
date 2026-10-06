import Svg, { Path } from 'react-native-svg';

const paths = {
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 1 9 7 9-7',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
  chart: 'M6 17v-5m6 5V7m6 10V3',
  income: 'M6 16 17 5M6 5h11v11',
  expense: 'M6 6 17 17M6 17h11V6',
  check: 'm5 12 4 4L19 6',
} as const;

interface AuthIconProps {
  name: keyof typeof paths;
  color: string;
  size?: number;
}

export function AuthIcon({ name, color, size = 20 }: AuthIconProps) {
  return (
    <Svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={paths[name]} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
