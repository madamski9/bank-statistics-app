import { StyleSheet } from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

export const importStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 22,
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
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
});
