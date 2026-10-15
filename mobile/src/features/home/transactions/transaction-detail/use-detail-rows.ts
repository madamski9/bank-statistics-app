import type { IngestionRecord } from '@bankstats/ingestion-native';

import { formatDayHeading, formatTime } from '@/features/app-shell/formatting/format-date';
import { useCopy } from '@/features/app-shell/localization/language';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { classifyTransaction } from '@/features/data/classification/classify-transaction';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { eventIdForRecord, type SpendingEvent } from '@/features/insights/events/spending-event';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { transactionContext, transactionKindLabel } from '../record/transaction-record';
import { transactionsCopy } from '../transactions-copy';

export interface DetailRow {
  label: string;
  value: string;
}

export function useDetailRows(record: IngestionRecord, rules: CategorizationRule[], events: SpendingEvent[]): DetailRow[] {
  const { formatAmount } = useAmountFormatting();
  const copy = useCopy(transactionsCopy);
  const occurredAt = new Date(record.occurredAt);
  const classified = classifyTransaction(record, rules);

  const details: DetailRow[] = [
    { label: copy.detail.date, value: `${formatDayHeading(occurredAt, new Date())}, ${formatTime(occurredAt)}` },
    { label: copy.detail.kind, value: transactionKindLabel(record) },
    { label: copy.detail.category, value: classified.categoryName },
    { label: copy.detail.account, value: transactionContext(record) },
  ];

  if (classified.merchantLocation !== undefined) {
    details.push({ label: copy.detail.place, value: classified.merchantLocation });
  }

  const eventId = eventIdForRecord(record, events);
  const event = events.find((candidate) => candidate.id === eventId);

  if (event !== undefined) {
    details.push({ label: copy.detail.event, value: event.name });
  }

  if (record.currency !== reportingCurrency) {
    if (record.reportingAmountMinor === undefined) {
      details.push({ label: copy.detail.inPln, value: copy.awaitingRate });
    } else {
      details.push({
        label: copy.detail.inPln,
        value: formatAmount(record.reportingAmountMinor, reportingCurrency),
      });
      details.push({
        label: copy.detail.rate,
        value: copy.rateValue(
          record.exchangeRate ?? '',
          record.exchangeRateDate ?? '',
          record.exchangeRateTable ?? '',
        ),
      });
    }
  }

  return details;
}
