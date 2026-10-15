import Svg, { Path } from 'react-native-svg';

import { onboardingColors as colors } from '../onboarding-motion';

const iconPaths = {
  chart: 'M5 19v-6m7 6V8m7 11V4',
  income: 'M6 16 17 5M6 5h11v11',
  expense: 'M6 6 17 17M6 17h11V6',
  check: 'm5 12 4 4L19 6',
  shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
  bell: 'M9 20h6M5 16h14l-2-3V9a5 5 0 0 0-10 0v4l-2 3Z',
  sparkle: 'm12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z',
} as const;

interface OnboardingIconProps {
  name: keyof typeof iconPaths;
  color?: string;
  size?: number;
}

export function OnboardingIcon({ name, color = colors.accentText, size = 24 }: OnboardingIconProps) {
  return (
    <Svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={iconPaths[name]} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
