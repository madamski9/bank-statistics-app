import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { LimitProgressBar } from '@/features/insights/alerts/components/limit-progress-bar';
import type { GroupLimit } from '@/features/insights/alerts/rules/group-limit';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { merchantsCopy } from '../../merchants-copy';

interface GroupLimitCardProps {
  limit: GroupLimit;
  onEdit: () => void;
}

export function GroupLimitCard({ limit, onEdit }: GroupLimitCardProps) {
  const { formatAmount } = useAmountFormatting();
  const copy = useCopy(merchantsCopy);

  return (
    <Pressable
      accessibilityHint={copy.limitHint}
      accessibilityLabel={`${copy.limitTitle(limit.periodLabel)}, ${copy.limitProgress(formatAmount(limit.amountMinor, limit.currency), formatAmount(limit.targetMinor, limit.currency))}`}
      accessibilityRole="button"
      onPress={onEdit}
      style={({ pressed }) => [styles.limit, pressed ? styles.pressed : null]}
    >
      <View style={styles.limitHeading}>
        <AmountText maxFontSizeMultiplier={1.5} style={styles.limitLabel}>
          {copy.limitTitle(limit.periodLabel)}
        </AmountText>
        <View style={styles.limitValue}>
          <AmountText maxFontSizeMultiplier={1.5} style={styles.limitAmount}>
            <AmountText
              style={[
                styles.limitSpent,
                limit.share >= 1 ? styles.limitSpentExceeded : null,
              ]}
            >
              {formatAmount(limit.amountMinor, limit.currency)}
            </AmountText>{' '}
            {copy.of} {formatAmount(limit.targetMinor, limit.currency)}
          </AmountText>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={12}
            tintColor={overviewColors.textSecondary}
            weight="semibold"
          />
        </View>
      </View>
      <LimitProgressBar share={limit.share} />
    </Pressable>
  );
}

export function SetLimitButton({ onPress }: { onPress: () => void }) {
  const copy = useCopy(merchantsCopy);

  return (
    <Pressable
      accessibilityHint={copy.setLimitHint}
      accessibilityLabel={copy.setLimit}
      accessibilityRole="button"
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
      onPress={onPress}
      style={({ pressed }) => [styles.limitAction, pressed ? styles.pressed : null]}
    >
      <SymbolView
        name={{ ios: 'plus', android: 'add', web: 'add' }}
        size={12}
        tintColor={overviewColors.textPrimary}
        weight="semibold"
      />
      <AmountText maxFontSizeMultiplier={1.3} style={styles.limitActionLabel}>
        {copy.setLimit}
      </AmountText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  limit: {
    gap: 10,
    paddingVertical: 4,
  },
  limitHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  limitLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  limitValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  limitAmount: {
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
  limitSpent: {
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  limitSpentExceeded: {
    color: overviewColors.negative,
  },
  limitAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surfacePressed,
  },
  limitActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
