import { Platform, StyleSheet, Text } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { overviewCopy } from '../overview-copy';

interface OverviewStatusProps {
  error: string | null;
  isLoading: boolean;
  hasData: boolean;
}

export function OverviewStatus({ error, isLoading, hasData }: OverviewStatusProps) {
  const copy = useCopy(overviewCopy);

  if (error !== null) {
    return (
      <Text maxFontSizeMultiplier={1.6} style={styles.error}>
        {error}
      </Text>
    );
  }

  if (!hasData && !isLoading) {
    return (
      <Text maxFontSizeMultiplier={1.6} style={styles.hint}>
        {Platform.OS === 'android' ? copy.noTransactionsAndroid : copy.noTransactions}
      </Text>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  hint: {
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.row,
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  error: {
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.row,
    fontSize: 13,
    color: overviewColors.negative,
  },
});
