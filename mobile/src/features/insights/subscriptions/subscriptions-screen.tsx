import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { SheetButton } from '@/features/app-shell/sheet/components/sheet-button';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import { useCopy } from '@/features/app-shell/localization/language';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { AddRecurringPayment } from './add-recurring-payment/add-recurring-payment';
import { daysUntil, RecurringPaymentRow } from './components/recurring-payment-row';
import {
  monthlyRecurringCost,
  upcomingFirst,
  type RecurringCandidate,
  type RecurringPayment,
  type TrackedPayment,
} from './recurring-payments';
import { subscriptionsCopy } from './subscriptions-copy';

interface SubscriptionsScreenProps {
  payments: RecurringPayment[];
  candidates: RecurringCandidate[];
  hasDismissed: boolean;
  onDismiss: (key: string) => Promise<void>;
  onRemoveTracked: (key: string) => Promise<void>;
  onTrack: (payment: TrackedPayment) => Promise<void>;
  onRestoreAll: () => Promise<void>;
  onClose: () => void;
}

export function SubscriptionsScreen({
  payments,
  candidates,
  hasDismissed,
  onDismiss,
  onRemoveTracked,
  onTrack,
  onRestoreAll,
  onClose,
}: SubscriptionsScreenProps) {
  const copy = useCopy(subscriptionsCopy);
  const { formatAmount } = useAmountFormatting();
  const now = useMemo(() => new Date(), []);
  const [isAdding, setIsAdding] = useState(false);
  const active = useMemo(() => upcomingFirst(payments.filter((payment) => payment.isActive)), [payments]);
  const inactive = payments.filter((payment) => !payment.isActive);
  const monthlyMinor = monthlyRecurringCost(payments);
  const nextUp = active[0];

  if (isAdding) {
    return (
      <AddRecurringPayment
        candidates={candidates}
        now={now}
        onAdd={async (payment) => {
          await onTrack(payment);
          setIsAdding(false);
        }}
        onBack={() => setIsAdding(false)}
        onClose={onClose}
      />
    );
  }

  const manage = (payment: RecurringPayment) => {
    if (payment.isTracked) {
      Alert.alert(copy.removeTitle(payment.name), copy.removeBody, [
        { style: 'cancel', text: copy.cancel },
        { style: 'destructive', text: copy.remove, onPress: () => void onRemoveTracked(payment.key) },
      ]);
      return;
    }

    Alert.alert(copy.dismissTitle(payment.name), copy.dismissBody, [
      { style: 'cancel', text: copy.cancel },
      { style: 'destructive', text: copy.hide, onPress: () => void onDismiss(payment.key) },
    ]);
  };

  const row = (payment: RecurringPayment, index: number) => (
    <RecurringPaymentRow
      isFirst={index === 0}
      key={payment.key}
      now={now}
      onPress={() => manage(payment)}
      payment={payment}
    />
  );

  return (
    <SheetLayout closeLabel={copy.close} onClose={onClose} title={copy.title}>
      <View style={styles.hero}>
        <AmountText maxFontSizeMultiplier={1.4} style={styles.caption}>
          {copy.monthlyTotal}
        </AmountText>
        <AmountText maxFontSizeMultiplier={1.3} style={styles.amount}>
          {formatAmount(monthlyMinor, reportingCurrency)}
        </AmountText>
        <AmountText maxFontSizeMultiplier={1.4} style={styles.caption}>
          {copy.activeCount(active.length)} · {copy.yearly(formatAmount(monthlyMinor * 12, reportingCurrency))}
        </AmountText>
        {nextUp !== undefined ? (
          <View style={styles.nextUp}>
            <Text maxFontSizeMultiplier={1.4} style={styles.nextUpLabel}>
              {copy.nextUp}
            </Text>
            <AmountText maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.nextUpValue}>
              {copy.nextUpLine(nextUp.name, copy.inDays(daysUntil(new Date(nextUp.nextExpectedAt), now)))} ·{' '}
              {formatAmount(nextUp.lastAmountMinor, reportingCurrency)}
            </AmountText>
          </View>
        ) : null}
      </View>

      <SheetButton label={copy.add} onPress={() => setIsAdding(true)} tone="primary" />

      {payments.length === 0 ? (
        <Text maxFontSizeMultiplier={1.5} style={styles.empty}>
          {copy.empty}
        </Text>
      ) : null}

      {active.length > 0 ? <SheetSection label={copy.active}>{active.map(row)}</SheetSection> : null}

      {inactive.length > 0 ? <SheetSection label={copy.inactive}>{inactive.map(row)}</SheetSection> : null}

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
  nextUp: {
    marginTop: overviewSpacing.tight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: overviewColors.surface,
  },
  nextUpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: overviewColors.caution,
  },
  nextUpValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textPrimary,
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
