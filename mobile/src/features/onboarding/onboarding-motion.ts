import { Easing, ReduceMotion } from 'react-native-reanimated';

import { bubbleTints, overviewColors } from '@/features/app-shell/theme/overview-theme';

export const onboardingColors = {
  ...overviewColors,
  accent: bubbleTints.net.film,
  accentText: '#B9ACFF',
  accentMuted: '#191525',
  accentBorder: 'rgba(143, 123, 255, 0.36)',
  positiveMuted: 'rgba(52, 227, 155, 0.10)',
  cautionMuted: 'rgba(255, 196, 107, 0.08)',
} as const;

export const onboardingMotion = {
  selection: { duration: 200, reduceMotion: ReduceMotion.System },
  float: { duration: 16000, easing: Easing.linear, reduceMotion: ReduceMotion.System },
};
