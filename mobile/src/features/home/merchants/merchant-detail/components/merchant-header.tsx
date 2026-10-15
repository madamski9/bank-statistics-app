import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatShare } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { SpendingGroup } from '@/features/data/classification/spending-groups';
import { periodOption, type SpendingPeriod } from '@/features/home/overview/period/periods';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { transactionCount } from '../../group-counts';
import { merchantsCopy } from '../../merchants-copy';

interface MerchantHeaderProps {
  group: SpendingGroup;
  period: SpendingPeriod;
  onClose: () => void;
}

export function MerchantHeader({ group, period, onClose }: MerchantHeaderProps) {
  const { formatAmount } = useAmountFormatting();
  const copy = useCopy(merchantsCopy);
  const option = periodOption(period);

  return (
    <View style={styles.header}>
      <View accessibilityElementsHidden importantForAccessibility="no" style={styles.handle} />
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.title}>
            {group.name}
          </Text>
          {group.subtitle !== undefined ? (
            <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.location}>
              {group.subtitle}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityHint={copy.backHint}
          accessibilityLabel={copy.closeLabel(group.name)}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.closeLabel}>
            {copy.close}
          </Text>
        </Pressable>
      </View>

      <AmountText
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.4}
        minimumFontScale={0.6}
        numberOfLines={1}
        style={styles.total}
      >
        {formatAmount(group.totalMinor, group.currency)}
      </AmountText>
      <AmountText maxFontSizeMultiplier={1.5} style={styles.meta}>
        {option.label} · {transactionCount(group.count, group.dimension)} · {copy.average}{' '}
        {formatAmount(group.averageMinor, group.currency)} ·{' '}
        {copy.shareOfSpending(formatShare(group.share))}
      </AmountText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.row,
  },
  handle: {
    width: 36,
    height: 4,
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flexShrink: 1,
    gap: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: overviewColors.textPrimary,
  },
  location: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  close: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  closeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
  total: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: overviewColors.textPrimary,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
});
