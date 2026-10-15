import { StyleSheet } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { onboardingColors } from '../onboarding-motion';

export const stepStyles = StyleSheet.create({
  stepContent: { gap: 24, width: '100%', maxWidth: 540, alignSelf: 'center' },
  title: {
    color: overviewColors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 38,
  },
  description: {
    color: overviewColors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  eyebrow: {
    color: onboardingColors.accentText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  featureList: { gap: 12 },
  smallNote: {
    color: overviewColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  stepsCard: {
    gap: 16,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  stepsTitle: {
    color: overviewColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  stepsLine: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
