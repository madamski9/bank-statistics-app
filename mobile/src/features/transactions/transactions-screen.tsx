import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Platform, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatAmount } from '@/features/spending-overview/formatting';
import {
  overviewColors,
  overviewSpacing,
} from '@/features/spending-overview/overview-theme';
import type { SpendingSourceKind } from '@/features/spending-overview/spending-summary';

import { dayKey, formatDayHeading, formatTime } from './format-date';

interface TransactionsScreenProps {
  records: IngestionRecord[];
  error: string | null;
  isLoading: boolean;
}

interface DaySection {
  key: string;
  title: string;
  totalMinor: number;
  currency: string;
  data: IngestionRecord[];
}

const sourceSymbols = {
  cardPayment: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  outgoingTransfer: { ios: 'arrow.up.forward', android: 'arrow_outward', web: 'arrow_outward' },
  incomingTransfer: {
    ios: 'arrow.down.backward',
    android: 'arrow_downward',
    web: 'arrow_downward',
  },
  other: { ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' },
} as const satisfies Record<SpendingSourceKind, { ios: string; android: string; web: string }>;

const typeLabels: Record<SpendingSourceKind, string> = {
  cardPayment: 'Płatność kartą',
  outgoingTransfer: 'Przelew wychodzący',
  incomingTransfer: 'Przelew przychodzący',
  other: 'Inna transakcja',
};

function recordKind(record: IngestionRecord): SpendingSourceKind {
  return record.transactionType ?? 'other';
}

function buildSections(records: IngestionRecord[], reference: Date): DaySection[] {
  const sections = new Map<string, DaySection>();
  const ordered = [...records].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );

  for (const record of ordered) {
    const occurredAt = new Date(record.occurredAt);

    if (Number.isNaN(occurredAt.getTime())) {
      continue;
    }

    const key = dayKey(occurredAt);
    const existing = sections.get(key);
    const signedMinor = record.direction === 'income' ? record.amountMinor : -record.amountMinor;

    if (existing === undefined) {
      sections.set(key, {
        key,
        title: formatDayHeading(occurredAt, reference),
        totalMinor: signedMinor,
        currency: record.currency,
        data: [record],
      });
      continue;
    }

    existing.data.push(record);
    existing.totalMinor += signedMinor;
  }

  return [...sections.values()];
}

/** The plain log behind the Overview: every captured transaction, newest first. */
export function TransactionsScreen({ records, error, isLoading }: TransactionsScreenProps) {
  const insets = useSafeAreaInsets();
  const sections = useMemo(() => buildSections(records, new Date()), [records]);

  const emptyMessage =
    error !== null
      ? error
      : Platform.OS !== 'ios'
        ? 'Przechwytywanie powiadomień działa na razie tylko na iOS.'
        : isLoading
          ? 'Wczytywanie…'
          : 'Nie przechwycono jeszcze żadnej transakcji. Skonfiguruj automatyzację powiadomień w aplikacji Skróty.';

  return (
    <SectionList
      ListEmptyComponent={
        <Text
          maxFontSizeMultiplier={1.6}
          style={[styles.empty, error !== null ? styles.error : null]}
        >
          {emptyMessage}
        </Text>
      }
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      indicatorStyle="white"
      keyExtractor={(record) => record.id}
      renderItem={({ item }) => {
        const occurredAt = new Date(item.occurredAt);
        const isIncome = item.direction === 'income';
        const label = item.merchant ?? typeLabels[recordKind(item)];
        const amount = `${isIncome ? '+' : '−'}${formatAmount(item.amountMinor, item.currency)}`;

        return (
          <View
            accessible
            accessibilityLabel={`${label}, ${amount}, ${formatTime(occurredAt)}`}
            style={styles.row}
          >
            <View style={styles.icon}>
              <SymbolView
                name={sourceSymbols[recordKind(item)]}
                size={17}
                tintColor={overviewColors.textSecondary}
              />
            </View>
            <View style={styles.body}>
              <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.label}>
                {label}
              </Text>
              <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.meta}>
                {formatTime(occurredAt)}
                {item.accountName !== undefined ? ` · ${item.accountName}` : ''}
              </Text>
            </View>
            <Text
              maxFontSizeMultiplier={1.6}
              style={[styles.amount, isIncome ? styles.amountIncome : null]}
            >
              {amount}
            </Text>
          </View>
        );
      }}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text maxFontSizeMultiplier={1.6} style={styles.sectionTitle}>
            {section.title}
          </Text>
          <Text maxFontSizeMultiplier={1.6} style={styles.sectionTotal}>
            {section.totalMinor < 0 ? '−' : '+'}
            {formatAmount(section.totalMinor, section.currency)}
          </Text>
        </View>
      )}
      sections={sections}
      stickySectionHeadersEnabled
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: overviewSpacing.block,
    paddingBottom: overviewSpacing.tight,
    backgroundColor: overviewColors.background,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  sectionTotal: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
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
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
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
  empty: {
    paddingTop: overviewSpacing.section,
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  error: {
    color: overviewColors.negative,
  },
});
