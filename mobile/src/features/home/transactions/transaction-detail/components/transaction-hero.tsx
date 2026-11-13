import type { IngestionRecord } from '@bankstats/ingestion-native';
import { StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { affectsStatistics, transactionBadge, transactionTitle } from '../../record/transaction-record';

interface TransactionHeroProps {
  record: IngestionRecord;
  rules: CategorizationRule[];
}

export function TransactionHero({ record, rules }: TransactionHeroProps) {
  const { formatAmount } = useAmountFormatting();
  const isIncome = record.direction === 'income';
  const badge = transactionBadge(record);
  const amount = `${isIncome ? '+' : '−'}${formatAmount(record.amountMinor, record.currency)}`;

  return (
    <View style={styles.hero}>
      <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={styles.title}>
        {transactionTitle(record, rules)}
      </Text>
      <AmountText
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.3}
        minimumFontScale={0.6}
        numberOfLines={1}
        style={[
          styles.amount,
          isIncome ? styles.amountIncome : null,
          affectsStatistics(record) ? null : styles.amountHeld,
        ]}
      >
        {amount}
      </AmountText>
      {badge !== null ? (
        <View
          style={[
            styles.badge,
            badge.tone === 'caution' ? styles.badgeCaution : styles.badgeNeutral,
          ]}
        >
          <AmountText
            maxFontSizeMultiplier={1.3}
            style={[
              styles.badgeLabel,
              badge.tone === 'caution' ? styles.badgeLabelCaution : styles.badgeLabelNeutral,
            ]}
          >
            {badge.label}
          </AmountText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: overviewColors.textPrimary,
  },
  amountIncome: {
    color: overviewColors.positive,
  },
  amountHeld: {
    color: overviewColors.textSecondary,
  },
  badge: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeCaution: {
    backgroundColor: 'rgba(255, 196, 107, 0.16)',
  },
  badgeNeutral: {
    backgroundColor: overviewColors.surfacePressed,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeLabelCaution: {
    color: overviewColors.caution,
  },
  badgeLabelNeutral: {
    color: overviewColors.textSecondary,
  },
});
