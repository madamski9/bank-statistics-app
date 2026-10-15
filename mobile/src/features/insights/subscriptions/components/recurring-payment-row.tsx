import { Pressable, StyleSheet, Text, View } from 'react-native';

import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { calendarCopy } from '@/features/app-shell/localization/calendar-copy';
import { useCopy } from '@/features/app-shell/localization/language';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { formatDayHeading } from '@/features/app-shell/formatting/format-date';

import { hasPriceIncrease, type RecurringPayment } from '../recurring-payments';
import { subscriptionsCopy } from '../subscriptions-copy';

const dayMs = 86_400_000;

export function daysUntil(date: Date, now: Date): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  return Math.round((end - start) / dayMs);
}

interface RecurringPaymentRowProps {
  payment: RecurringPayment;
  now: Date;
  isFirst: boolean;
  onPress: () => void;
}

export function RecurringPaymentRow({ payment, now, isFirst, onPress }: RecurringPaymentRowProps) {
  const copy = useCopy(subscriptionsCopy);
  const calendar = useCopy(calendarCopy);
  const { formatAmount } = useAmountFormatting();
  const date = new Date(payment.isActive ? payment.nextExpectedAt : payment.lastChargedAt);
  const days = daysUntil(date, now);
  const isSoon = payment.isActive && days <= 3;
  const increase = hasPriceIncrease(payment) && payment.previousAmountMinor !== null;
  const timing = payment.isActive
    ? `${copy.inDays(days)} · ${formatDayHeading(date, now)}`
    : copy.lapsed(formatDayHeading(date, now));
  const cadence = payment.isTracked
    ? `${copy.cadences[payment.cadence]} · ${copy.addedByYou}`
    : copy.cadences[payment.cadence];

  return (
    <Pressable
      accessibilityHint={copy.manageHint}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, isFirst ? null : styles.divider, pressed ? styles.pressed : null]}
    >
      <View style={[styles.dateTile, isSoon ? styles.dateTileSoon : null]}>
        <Text
          maxFontSizeMultiplier={1.2}
          style={[styles.day, payment.isActive ? null : styles.muted, isSoon ? styles.soon : null]}
        >
          {date.getDate()}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={[styles.month, isSoon ? styles.soon : null]}>
          {calendar.shortMonths[date.getMonth()]}
        </Text>
      </View>
      <View style={styles.copy}>
        <AmountText maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.name}>
          {payment.name}
        </AmountText>
        <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={[styles.detail, isSoon ? styles.soon : null]}>
          {timing}
        </Text>
        <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.detail}>
          {cadence}
        </Text>
        {increase ? (
          <AmountText maxFontSizeMultiplier={1.4} numberOfLines={2} style={[styles.detail, styles.caution]}>
            {copy.priceIncrease(
              formatAmount(payment.previousAmountMinor ?? 0, reportingCurrency),
              formatAmount(payment.lastAmountMinor, reportingCurrency),
            )}
          </AmountText>
        ) : null}
      </View>
      <AmountText
        maxFontSizeMultiplier={1.4}
        numberOfLines={1}
        style={[styles.amount, payment.isActive ? null : styles.muted, increase ? styles.caution : null]}
      >
        {formatAmount(payment.lastAmountMinor, reportingCurrency)}
      </AmountText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: overviewSpacing.block,
    paddingVertical: 12,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  pressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  dateTile: {
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: overviewColors.surfacePressed,
  },
  dateTileSoon: {
    backgroundColor: 'rgba(255, 196, 107, 0.12)',
  },
  day: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  month: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: overviewColors.textSecondary,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  detail: {
    fontSize: 12,
    lineHeight: 16,
    color: overviewColors.textSecondary,
  },
  amount: {
    maxWidth: '40%',
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  muted: {
    color: overviewColors.textSecondary,
  },
  soon: {
    color: overviewColors.caution,
  },
  caution: {
    color: overviewColors.caution,
  },
});
