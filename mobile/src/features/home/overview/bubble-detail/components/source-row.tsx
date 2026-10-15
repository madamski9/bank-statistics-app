import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatShare, formatTransactionCount } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { transactionKindSymbols } from '@/features/home/transactions/record/transaction-kind-symbols';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { spendingOverviewCopy } from '../../spending-overview-copy';
import type { SpendingSource } from '../../spending/spending-summary';

interface SourceRowProps {
  source: SpendingSource;
  currency: string;
  tint: string;
  isSelectable: boolean;
  onSelect: (source: SpendingSource) => void;
}

export function SourceRow({ source, currency, tint, isSelectable, onSelect }: SourceRowProps) {
  const copy = useCopy(spendingOverviewCopy);
  const { formatAmount } = useAmountFormatting();

  return (
    <Pressable
      accessibilityHint={isSelectable ? copy.sourceHint : undefined}
      accessibilityLabel={`${source.label}, ${formatAmount(
        source.amountMinor,
        currency,
      )}, ${formatShare(source.share)}, ${formatTransactionCount(source.count)}`}
      accessibilityRole={isSelectable ? 'button' : 'text'}
      disabled={!isSelectable}
      onPress={() => onSelect(source)}
      style={({ pressed }) => [styles.sourceRow, pressed ? styles.pressed : null]}
    >
      <View style={styles.sourceIcon}>
        <SymbolView
          name={transactionKindSymbols[source.kind]}
          size={17}
          tintColor={overviewColors.textSecondary}
        />
      </View>
      <View style={styles.sourceBody}>
        <View style={styles.sourceHeading}>
          <AmountText maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.sourceLabel}>
            {source.label}
          </AmountText>
          <AmountText maxFontSizeMultiplier={1.6} style={styles.sourceAmount}>
            {formatAmount(source.amountMinor, currency)}
          </AmountText>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.max(source.share * 100, 2)}%`,
                backgroundColor: tint,
              },
            ]}
          />
        </View>
        <AmountText maxFontSizeMultiplier={1.6} style={styles.sourceMeta}>
          {formatShare(source.share)} · {formatTransactionCount(source.count)}
        </AmountText>
      </View>
      {isSelectable ? (
        <View style={styles.sourceChevron}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={12}
            tintColor={overviewColors.textSecondary}
            weight="semibold"
          />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sourceIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  sourceBody: {
    flex: 1,
    gap: 6,
  },
  sourceChevron: {
    height: 20,
    justifyContent: 'center',
  },
  sourceHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sourceLabel: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  sourceAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  barTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  sourceMeta: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
});
