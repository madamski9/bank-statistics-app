import { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import { SheetButton, SheetLayout, SheetRow, SheetSection } from '@/features/sheets/sheet-layout';
import { useCopy } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { overviewColors } from '@/features/spending-overview/overview-theme';
import { formatDayHeading } from '@/features/transactions/format-date';

import {
  hasPriceIncrease,
  monthlyRecurringCost,
  type RecurringPayment,
} from './recurring-payments';
import { subscriptionsCopy } from './subscriptions-copy';

interface SubscriptionsScreenProps {
  payments: RecurringPayment[];
  hasDismissed: boolean;
  onDismiss: (key: string) => Promise<void>;
  onRestoreAll: () => Promise<void>;
  onClose: () => void;
}

export function SubscriptionsScreen({
  payments,
  hasDismissed,
  onDismiss,
  onRestoreAll,
  onClose,
}: SubscriptionsScreenProps) {
  const copy = useCopy(subscriptionsCopy);
  const { formatAmount } = useAmountFormatting();
  const now = useMemo(() => new Date(), []);
  const active = payments.filter((payment) => payment.isActive);
  const inactive = payments.filter((payment) => !payment.isActive);
  const monthlyMinor = monthlyRecurringCost(payments);

  const confirmDismiss = (payment: RecurringPayment) => {
    Alert.alert(copy.dismissTitle(payment.name), copy.dismissBody, [
      { style: 'cancel', text: copy.cancel },
      { style: 'destructive', text: copy.hide, onPress: () => void onDismiss(payment.key) },
    ]);
  };

  const row = (payment: RecurringPayment, index: number) => {
    const increase = hasPriceIncrease(payment) && payment.previousAmountMinor !== null;
    const when = payment.isActive
      ? copy.next(formatDayHeading(new Date(payment.nextExpectedAt), now))
      : copy.lapsed(formatDayHeading(new Date(payment.lastChargedAt), now));
    const detail = increase
      ? `${copy.cadences[payment.cadence]} · ${copy.priceIncrease(
          formatAmount(payment.previousAmountMinor ?? 0, reportingCurrency),
          formatAmount(payment.lastAmountMinor, reportingCurrency),
        )}`
      : `${copy.cadences[payment.cadence]} · ${when}`;

    return (
      <SheetRow
        accessibilityHint={copy.dismiss}
        detail={detail}
        isFirst={index === 0}
        key={payment.key}
        label={payment.name}
        onPress={() => confirmDismiss(payment)}
        value={formatAmount(payment.lastAmountMinor, reportingCurrency)}
        valueTone={increase ? 'caution' : payment.isActive ? 'default' : 'muted'}
      />
    );
  };

  return (
    <SheetLayout closeLabel={copy.close} onClose={onClose} title={copy.title}>
      <View style={styles.hero}>
        <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
          {copy.monthlyTotal}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.amount}>
          {formatAmount(monthlyMinor, reportingCurrency)}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
          {copy.activeCount(active.length)} · {copy.yearly(formatAmount(monthlyMinor * 12, reportingCurrency))}
        </Text>
      </View>

      {payments.length === 0 ? (
        <Text maxFontSizeMultiplier={1.5} style={styles.empty}>
          {copy.empty}
        </Text>
      ) : null}

      {active.length > 0 ? (
        <SheetSection label={copy.active}>{active.map(row)}</SheetSection>
      ) : null}

      {inactive.length > 0 ? (
        <SheetSection label={copy.inactive}>{inactive.map(row)}</SheetSection>
      ) : null}

      <Text maxFontSizeMultiplier={1.5} style={styles.footnote}>
        {copy.footnote}
      </Text>

      {hasDismissed ? <SheetButton label={copy.restore} onPress={() => void onRestoreAll()} /> : null}
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 4,
  },
  caption: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
});
