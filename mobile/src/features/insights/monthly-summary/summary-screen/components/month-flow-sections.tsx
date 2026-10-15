import { formatShare } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import type { MonthlySummary } from '../../monthly-summary';
import { monthlySummaryCopy } from '../../monthly-summary-copy';

interface MonthFlowSectionsProps {
  summary: MonthlySummary;
}

export function MonthFlowSections({ summary }: MonthFlowSectionsProps) {
  const copy = useCopy(monthlySummaryCopy);
  const { formatAmount, formatSignedAmount } = useAmountFormatting();

  return (
    <>
      <SheetSection label={copy.flow}>
        <SheetRow
          isFirst
          label={copy.received}
          value={`+${formatAmount(summary.incomeMinor, reportingCurrency)}`}
          valueTone="positive"
        />
        <SheetRow
          label={copy.net}
          value={formatSignedAmount(summary.netMinor, reportingCurrency)}
          valueTone={summary.netMinor < 0 ? 'negative' : 'positive'}
        />
        {summary.recurringMinor > 0 ? (
          <SheetRow
            label={copy.recurring}
            value={copy.recurringValue(
              formatAmount(summary.recurringMinor, reportingCurrency),
              formatShare(summary.expenseMinor === 0 ? 0 : summary.recurringMinor / summary.expenseMinor),
            )}
          />
        ) : null}
      </SheetSection>

      {summary.events.length > 0 ? (
        <SheetSection label={copy.events}>
          {summary.events.map((entry, rowIndex) => (
            <SheetRow
              isFirst={rowIndex === 0}
              key={entry.event.id}
              label={entry.event.name}
              value={formatAmount(entry.expenseMinor, reportingCurrency)}
            />
          ))}
        </SheetSection>
      ) : null}
    </>
  );
}
