import { bubbleTints, overviewColors } from '@/features/app-shell/theme/overview-theme';

export const authColors = {
  ...overviewColors,
  border: 'rgba(255, 255, 255, 0.12)',
  controlBorder: '#62616D',
  input: '#141318',
  inputFocused: '#1A1726',
  accent: bubbleTints.net.film,
  accentText: '#B9ACFF',
  accentMuted: 'rgba(143, 123, 255, 0.12)',
  accentBorder: 'rgba(143, 123, 255, 0.32)',
  onAccent: overviewColors.background,
  danger: overviewColors.negative,
  dangerMuted: 'rgba(255, 92, 122, 0.08)',
  successMuted: 'rgba(52, 227, 155, 0.08)',
  google: '#131314',
  apple: '#FFFFFF',
} as const;
