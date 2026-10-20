import { StyleSheet } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

export const inboxStyles = StyleSheet.create({
  text: { color: overviewColors.textPrimary, fontSize: 15, lineHeight: 22 },
  note: { color: overviewColors.textSecondary, fontSize: 13, lineHeight: 19 },
  error: { color: overviewColors.negative, fontSize: 14, lineHeight: 20 },
  status: { color: overviewColors.positive, fontSize: 14, lineHeight: 20 },
  block: { gap: 10 },
  card: { padding: 16, borderRadius: 16, gap: 10, backgroundColor: overviewColors.surfacePressed },
  label: { color: overviewColors.textSecondary, fontSize: 12 },
  input: {
    color: overviewColors.textPrimary,
    backgroundColor: overviewColors.surfacePressed,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  bodyInput: { minHeight: 160 },
  json: {
    color: overviewColors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
