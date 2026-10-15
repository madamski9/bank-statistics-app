import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { eventPeriodLabel } from '../../event-period-label';
import type { EventSummary } from '../../event-summary';
import { eventsCopy } from '../../events-copy';
import type { SpendingEvent } from '../../spending-event';

interface EventHeroProps {
  event: SpendingEvent;
  summary: EventSummary;
  now: Date;
}

export function EventHero({ event, summary, now }: EventHeroProps) {
  const copy = useCopy(eventsCopy);
  const { formatAmount } = useAmountFormatting();

  return (
    <View style={styles.hero}>
      <AmountText maxFontSizeMultiplier={1.4} style={styles.period}>
        {eventPeriodLabel(event, now, copy)}
      </AmountText>
      <AmountText adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.amount}>
        {formatAmount(summary.expenseMinor, reportingCurrency)}
      </AmountText>
      <Text maxFontSizeMultiplier={1.4} style={styles.meta}>
        {copy.days(summary.days)} · {copy.transactionsCount(summary.count)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 4,
  },
  period: {
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
});
