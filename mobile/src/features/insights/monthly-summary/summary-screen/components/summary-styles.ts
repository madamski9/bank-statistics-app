import { StyleSheet } from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

export const summaryStyles = StyleSheet.create({
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  section: {
    gap: overviewSpacing.tight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
});
