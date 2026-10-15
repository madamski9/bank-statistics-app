import { formatShare } from '@/features/app-shell/formatting/formatting';
import { formatDayHeading } from '@/features/app-shell/formatting/format-date';
import { useCopy } from '@/features/app-shell/localization/language';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { transactionTitle } from '@/features/home/transactions/record/transaction-record';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import type { EventSummary } from '../../event-summary';
import { eventsCopy } from '../../events-copy';

const maximumListedTransactions = 50;

interface EventBreakdownProps {
  summary: EventSummary;
  rules: CategorizationRule[];
  now: Date;
}

export function EventBreakdown({ summary, rules, now }: EventBreakdownProps) {
  const copy = useCopy(eventsCopy);
  const { formatAmount } = useAmountFormatting();

  return (
    <>
      <SheetSection>
        <SheetRow isFirst label={copy.perDay} value={formatAmount(summary.dailyExpenseMinor, reportingCurrency)} />
        {summary.incomeMinor > 0 ? (
          <SheetRow
            label={copy.received}
            value={`+${formatAmount(summary.incomeMinor, reportingCurrency)}`}
            valueTone="positive"
          />
        ) : null}
      </SheetSection>

      {summary.categories.length > 0 ? (
        <SheetSection label={copy.categories}>
          {summary.categories.map((group, index) => (
            <SheetRow
              detail={formatShare(group.share)}
              isFirst={index === 0}
              key={group.key}
              label={group.name}
              value={formatAmount(group.totalMinor, reportingCurrency)}
            />
          ))}
        </SheetSection>
      ) : null}

      {summary.merchants.length > 0 ? (
        <SheetSection label={copy.merchants}>
          {summary.merchants.slice(0, 5).map((group, index) => (
            <SheetRow
              detail={copy.transactionsCount(group.count)}
              isFirst={index === 0}
              key={group.key}
              label={group.name}
              value={formatAmount(group.totalMinor, reportingCurrency)}
            />
          ))}
        </SheetSection>
      ) : null}

      <SheetSection
        footnote={copy.manualHint}
        label={copy.transactions}
      >
        {summary.records.length === 0 ? (
          <SheetRow isFirst label={copy.noTransactions} />
        ) : (
          summary.records.slice(0, maximumListedTransactions).map((record, index) => (
            <SheetRow
              detail={formatDayHeading(new Date(record.occurredAt), now)}
              isFirst={index === 0}
              key={record.id}
              label={transactionTitle(record, rules)}
              value={`${record.direction === 'income' ? '+' : '−'}${formatAmount(record.amountMinor, record.currency)}`}
              valueTone={record.direction === 'income' ? 'positive' : 'default'}
            />
          ))
        )}
      </SheetSection>
    </>
  );
}
