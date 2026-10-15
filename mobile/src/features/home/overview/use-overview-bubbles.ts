import { formatTransactionCount } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { eventTint } from '@/features/insights/events/event-colors';
import type { EventSummary } from '@/features/insights/events/event-summary';
import { eventsCopy } from '@/features/insights/events/events-copy';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import type { BubbleDescriptor } from './bubbles/bubble-field';
import { overviewCopy } from './overview-copy';
import { periodOption, type SpendingPeriod } from './period/periods';
import type { SpendingSummary } from './spending/spending-summary';

const unavailableValue = '-';

interface OverviewBubblesOptions {
  summary: SpendingSummary;
  period: SpendingPeriod;
  isLoading: boolean;
  hasData: boolean;
  focusedEvent: EventSummary | null;
}

export function useOverviewBubbles({
  summary,
  period,
  isLoading,
  hasData,
  focusedEvent,
}: OverviewBubblesOptions): BubbleDescriptor[] {
  const { formatAmount, formatCompactAmount, formatSignedCompactAmount } = useAmountFormatting();
  const copy = useCopy(overviewCopy);
  const eventCopy = useCopy(eventsCopy);
  const option = periodOption(period);

  if (focusedEvent !== null) {
    const expense = formatAmount(focusedEvent.expenseMinor, reportingCurrency);
    const income = formatCompactAmount(focusedEvent.incomeMinor, reportingCurrency);
    const net = formatSignedCompactAmount(focusedEvent.netMinor, reportingCurrency);
    const count = formatTransactionCount(focusedEvent.count);

    return [
      {
        key: 'expense',
        label: focusedEvent.event.name,
        value: expense,
        caption: count,
        tint: eventTint(focusedEvent.event),
        accessibilityLabel: eventCopy.eventBubbleLabel(focusedEvent.event.name, expense, count),
      },
      {
        key: 'income',
        label: copy.income,
        value: income,
        accessibilityLabel: eventCopy.eventIncomeLabel(income),
      },
      {
        key: 'net',
        label: copy.net,
        value: net,
        accessibilityLabel: eventCopy.eventNetLabel(net),
      },
    ];
  }

  const amount = (minor: number, compact: boolean, signed = false) => {
    if (!hasData && isLoading) {
      return unavailableValue;
    }

    if (signed) {
      return formatSignedCompactAmount(minor, summary.currency);
    }

    return compact
      ? formatCompactAmount(minor, summary.currency)
      : formatAmount(minor, summary.currency);
  };

  return [
    {
      key: 'expense',
      label: copy.expense,
      value: amount(summary.expenseMinor, false),
      caption: formatTransactionCount(summary.expenseCount),
      accessibilityLabel: copy.expenseLabel(
        amount(summary.expenseMinor, false),
        option.label,
        formatTransactionCount(summary.expenseCount),
      ),
    },
    {
      key: 'income',
      label: copy.income,
      value: amount(summary.incomeMinor, true),
      accessibilityLabel: copy.incomeLabel(amount(summary.incomeMinor, true), option.label),
    },
    {
      key: 'net',
      label: copy.net,
      value: amount(summary.netMinor, true, true),
      accessibilityLabel: copy.netLabel(amount(summary.netMinor, true, true), option.label),
    },
  ];
}
