import { StyleSheet } from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

export const deletionStyles = StyleSheet.create({
  block: {
    gap: overviewSpacing.block,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: overviewColors.textSecondary,
  },
});
