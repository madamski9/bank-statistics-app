import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatTime } from '@/features/app-shell/formatting/format-date';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { eventTint } from '@/features/insights/events/event-colors';
import { eventsCopy } from '@/features/insights/events/events-copy';
import type { SpendingEvent } from '@/features/insights/events/spending-event';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { transactionKindSymbols } from '../../record/transaction-kind-symbols';
import {
  affectsStatistics,
  transactionBadge,
  transactionContext,
  transactionKind,
  transactionTitle,
} from '../../record/transaction-record';
import { transactionsCopy } from '../../transactions-copy';

interface TransactionRowProps {
  record: IngestionRecord;
  rules: CategorizationRule[];
  event: SpendingEvent | undefined;
  onPress: () => void;
}

export function TransactionRow({ record, rules, event, onPress }: TransactionRowProps) {
  const { formatAmount } = useAmountFormatting();
  const copy = useCopy(transactionsCopy);
  const eventCopy = useCopy(eventsCopy);
  const occurredAt = new Date(record.occurredAt);
  const isIncome = record.direction === 'income';
  const isCounted = affectsStatistics(record);
  const badge = transactionBadge(record);
  const label = transactionTitle(record, rules);
  const context = transactionContext(record);
  const amount = `${isIncome ? '+' : '−'}${formatAmount(record.amountMinor, record.currency)}`;
  const tint = event === undefined ? null : eventTint(event);

  return (
    <Pressable
      accessibilityHint={copy.rowHint}
      accessibilityLabel={[
        label,
        amount,
        context,
        formatTime(occurredAt),
        badge?.label,
        event === undefined ? undefined : eventCopy.inEvent(event.name),
      ]
        .filter((part) => part !== undefined)
        .join(', ')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View
        style={[
          styles.icon,
          tint === null
            ? null
            : { borderColor: tint.film, backgroundColor: `rgba(${tint.rgb}, 0.16)` },
        ]}
      >
        <SymbolView
          name={transactionKindSymbols[transactionKind(record)]}
          size={17}
          tintColor={tint?.film ?? overviewColors.textSecondary}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.labelRow}>
          <AmountText maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.label}>
            {label}
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
                  badge.tone === 'caution'
                    ? styles.badgeLabelCaution
                    : styles.badgeLabelNeutral,
                ]}
              >
                {badge.label}
              </AmountText>
            </View>
          ) : null}
        </View>
        <AmountText maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.meta}>
          {formatTime(occurredAt)} · {context}
        </AmountText>
      </View>
      <AmountText
        maxFontSizeMultiplier={1.6}
        style={[
          styles.amount,
          isIncome ? styles.amountIncome : null,
          isCounted ? null : styles.amountHeld,
        ]}
      >
        {amount}
      </AmountText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 14,
  },
  rowPressed: {
    backgroundColor: overviewColors.surface,
  },
  icon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  badgeCaution: {
    backgroundColor: 'rgba(255, 196, 107, 0.16)',
  },
  badgeNeutral: {
    backgroundColor: overviewColors.surfacePressed,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeLabelCaution: {
    color: overviewColors.caution,
  },
  badgeLabelNeutral: {
    color: overviewColors.textSecondary,
  },
  meta: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: overviewColors.textPrimary,
  },
  amountIncome: {
    color: overviewColors.positive,
  },
  amountHeld: {
    color: overviewColors.textSecondary,
  },
});
