import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatShare } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import { bubbleTints, overviewColors } from '@/features/app-shell/theme/overview-theme';
import type { SpendingDimension, SpendingGroup } from '@/features/data/classification/spending-groups';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { transactionCount } from '../group-counts';
import { merchantsCopy } from '../merchants-copy';

interface SpendingGroupRowProps {
  group: SpendingGroup;
  rank: number;
  dimension: SpendingDimension;
  onPress: () => void;
}

export function SpendingGroupRow({ group, rank, dimension, onPress }: SpendingGroupRowProps) {
  const { formatAmount } = useAmountFormatting();
  const copy = useCopy(merchantsCopy);

  return (
    <Pressable
      accessibilityHint={copy.groupHint}
      accessibilityLabel={`${rank}. ${group.name}, ${formatAmount(group.totalMinor, group.currency)}, ${transactionCount(group.count, dimension)}, ${copy.shareOfSpending(formatShare(group.share))}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <Text maxFontSizeMultiplier={1.3} style={styles.rank}>
        {rank}
      </Text>
      <View style={styles.body}>
        <View style={styles.heading}>
          <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.name}>
            {group.name}
          </Text>
          <AmountText maxFontSizeMultiplier={1.6} style={styles.amount}>
            {formatAmount(group.totalMinor, group.currency)}
          </AmountText>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.max(group.share * 100, 2)}%`,
                backgroundColor: bubbleTints.expense.film,
              },
            ]}
          />
        </View>
        <AmountText maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.meta}>
          {transactionCount(group.count, dimension)} · {copy.shareOfSpending(formatShare(group.share))}
          {group.subtitle !== undefined ? ` · ${group.subtitle}` : ''}
        </AmountText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 44,
    borderRadius: 14,
    paddingVertical: 10,
  },
  pressed: {
    backgroundColor: overviewColors.surface,
  },
  rank: {
    width: 20,
    paddingTop: 1,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: overviewColors.textSecondary,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: overviewColors.textPrimary,
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  track: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  meta: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
});
