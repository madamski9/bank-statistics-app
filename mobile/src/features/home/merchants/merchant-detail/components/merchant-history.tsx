import type { IngestionRecord } from '@bankstats/ingestion-native';
import { StyleSheet, Text, View } from 'react-native';

import { formatDayHeading, formatTime } from '@/features/app-shell/formatting/format-date';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { merchantsCopy } from '../../merchants-copy';
import { transactionParty } from '../../naming/transaction-party';

interface MerchantHistoryProps {
  records: IngestionRecord[];
  rules: CategorizationRule[];
  showsParty: boolean;
}

export function MerchantHistory({ records, rules, showsParty }: MerchantHistoryProps) {
  const copy = useCopy(merchantsCopy);

  return (
    <View style={styles.history}>
      <Text maxFontSizeMultiplier={1.5} style={styles.historyTitle}>
        {copy.history}
      </Text>
      {records.map((record) => (
        <HistoryRow
          key={record.id}
          party={showsParty ? transactionParty(record, rules) : null}
          record={record}
        />
      ))}
    </View>
  );
}

function HistoryRow({ record, party }: { record: IngestionRecord; party: string | null }) {
  const { formatAmount } = useAmountFormatting();
  const occurredAt = new Date(record.occurredAt);

  return (
    <View
      accessible
      accessibilityLabel={`${party === null ? '' : `${party}, `}${formatDayHeading(occurredAt, new Date())}, ${formatTime(occurredAt)}, ${formatAmount(record.amountMinor, record.currency)}`}
      style={styles.historyRow}
    >
      <View style={styles.historyCopy}>
        {party !== null ? (
          <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.historyParty}>
            {party}
          </Text>
        ) : null}
        <AmountText
          maxFontSizeMultiplier={1.5}
          style={party === null ? styles.historyDate : styles.historyTime}
        >
          {formatDayHeading(occurredAt, new Date())}
          <AmountText style={styles.historyTime}> · {formatTime(occurredAt)}</AmountText>
        </AmountText>
      </View>
      <AmountText maxFontSizeMultiplier={1.5} style={styles.historyAmount}>
        − {formatAmount(record.amountMinor, record.currency)}
      </AmountText>
    </View>
  );
}

const styles = StyleSheet.create({
  history: {
    gap: 2,
  },
  historyCopy: {
    flexShrink: 1,
    gap: 2,
  },
  historyParty: {
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: overviewColors.textPrimary,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: overviewColors.hairline,
  },
  historyDate: {
    fontSize: 15,
    color: overviewColors.textPrimary,
  },
  historyTime: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
});
