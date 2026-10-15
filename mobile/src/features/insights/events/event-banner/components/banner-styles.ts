import { StyleSheet } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

export const bannerStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
});
