import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatChange } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

import { periodOption, type SpendingPeriod } from '../../period/periods';
import { RangeSwitcher } from '../../period/range-switcher';
import { spendingOverviewCopy } from '../../spending-overview-copy';

const detailAmountFontSize = 44;

interface DetailHeaderProps {
  title: string;
  amount: string;
  change: number | null;
  isChangeWelcome: boolean;
  period: SpendingPeriod;
  lockedPeriods: ReadonlySet<SpendingPeriod>;
  onChangePeriod: (period: SpendingPeriod) => void;
  onClose: () => void;
}

export function DetailHeader({
  title,
  amount,
  change,
  isChangeWelcome,
  period,
  lockedPeriods,
  onChangePeriod,
  onClose,
}: DetailHeaderProps) {
  const copy = useCopy(spendingOverviewCopy);
  const option = periodOption(period);

  return (
    <View style={styles.header}>
      <View accessibilityElementsHidden importantForAccessibility="no" style={styles.handle} />
      <View style={styles.headerRow}>
        <Text maxFontSizeMultiplier={1.6} style={styles.title}>
          {title}
        </Text>
        <Pressable
          accessibilityHint={copy.closeHint}
          accessibilityLabel={copy.closeLabel(title)}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.closeLabel}>
            {copy.close}
          </Text>
        </Pressable>
      </View>

      <View style={styles.amountBlock}>
        <AmountText
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.4}
          minimumFontScale={0.6}
          numberOfLines={1}
          style={styles.amount}
        >
          {amount}
        </AmountText>
      </View>

      <View style={styles.metaRow}>
        <AmountText maxFontSizeMultiplier={1.6} style={styles.meta}>
          {option.label}
        </AmountText>
        {change !== null ? (
          <AmountText
            maxFontSizeMultiplier={1.6}
            style={[
              styles.meta,
              styles.metaChange,
              { color: isChangeWelcome ? overviewColors.positive : overviewColors.negative },
            ]}
          >
            {change >= 0 ? '▲' : '▼'} {formatChange(change)} {copy.versus} {option.previousLabel}
          </AmountText>
        ) : null}
      </View>

      <RangeSwitcher lockedPeriods={lockedPeriods} onChange={onChangePeriod} period={period} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  closeButton: {
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
  amountBlock: {
    alignSelf: 'flex-start',
  },
  amount: {
    fontSize: detailAmountFontSize,
    fontWeight: '700',
    letterSpacing: -1.4,
    color: overviewColors.textPrimary,
  },
  metaRow: {
    gap: 2,
    paddingBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  metaChange: {
    fontWeight: '600',
  },
});
