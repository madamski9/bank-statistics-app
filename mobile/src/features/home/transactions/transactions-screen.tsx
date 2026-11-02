import type { IngestionRecord } from '@bankstats/ingestion-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { needsIosUpdateForCapture } from '@/features/app-shell/capture-support/device-capture-support';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { CustomCategory } from '@/features/data/classification/categories';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';
import type { IgnoreRule, IgnoreTarget } from '@/features/data/ignored-payments/ignore-rule';
import { eventIdForRecord, type SpendingEvent } from '@/features/insights/events/spending-event';

import { AddTransactionButton } from './components/add-transaction-button';
import { TransactionSheet } from './components/transaction-sheet';
import { EventMarkerRow } from './history/components/event-marker-row';
import { HistorySectionHeader } from './history/components/history-section-header';
import { TransactionRow } from './history/components/transaction-row';
import { buildSections, firstDays, historyPageSize } from './history/history-sections';
import { transactionsCopy } from './transactions-copy';
import { useTransactionEditing } from './use-transaction-editing';

interface TransactionsScreenProps {
  records: IngestionRecord[];
  accounts: FinancialAccount[];
  onCreateAccount: (name: string) => Promise<FinancialAccount>;
  rules: CategorizationRule[];
  error: string | null;
  isLoading: boolean;
  onChanged: () => void | Promise<void>;
  onRememberRule: (merchantLabel: string, category: string) => Promise<void>;
  events: SpendingEvent[];
  customCategories: CustomCategory[];
  canCreateCategory: boolean;
  canRememberRule: boolean;
  onCreateCategory: (name: string) => Promise<CustomCategory>;
  ignoreRules: IgnoreRule[];
  onIgnore: (rule: IgnoreRule) => Promise<void>;
  onStopIgnoring: (target: IgnoreTarget) => Promise<void>;
  onRequirePremium: () => void;
}

function TransactionsScreenComponent({
  records,
  rules,
  error,
  isLoading,
  onChanged,
  onRememberRule,
  events,
  ...sheetProps
}: TransactionsScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(transactionsCopy);
  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const sections = useMemo(() => buildSections(records, new Date(), events), [events, records]);
  const [rowLimit, setRowLimit] = useState(historyPageSize);
  const visible = useMemo(() => firstDays(sections, rowLimit), [rowLimit, sections]);
  const showMore = useCallback(() => {
    if (visible.hasMore) {
      setRowLimit((limit) => limit + historyPageSize);
    }
  }, [visible.hasMore]);
  const editing = useTransactionEditing({ onChanged, onRememberRule });

  const emptyMessage =
    error !== null
      ? error
      : Platform.OS !== 'ios'
        ? copy.captureIosOnly
        : isLoading
          ? copy.loading
          : needsIosUpdateForCapture
            ? copy.emptyWithoutCapture
            : copy.empty;

  return (
    <View style={styles.screen}>
      <SectionList
        ListEmptyComponent={
          <Text
            maxFontSizeMultiplier={1.6}
            style={[styles.empty, error !== null ? styles.error : null]}
          >
            {emptyMessage}
          </Text>
        }
        ListFooterComponent={
          visible.hasMore ? <ActivityIndicator color={overviewColors.textSecondary} style={styles.more} /> : null
        }
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        indicatorStyle="white"
        keyExtractor={(row) => row.key}
        renderItem={({ item: row }) => {
          if (row.kind === 'marker') {
            return <EventMarkerRow boundary={row.boundary} event={row.event} />;
          }

          const eventId = eventsById.size === 0 ? null : eventIdForRecord(row.record, events);

          return (
            <TransactionRow
              event={eventId === null ? undefined : eventsById.get(eventId)}
              onPress={() => editing.openDetail(row.record)}
              record={row.record}
              rules={rules}
            />
          );
        }}
        renderSectionHeader={({ section }) => <HistorySectionHeader section={section} />}
        onEndReached={showMore}
        onEndReachedThreshold={0.6}
        sections={visible.sections}
        stickySectionHeadersEnabled
        style={styles.list}
      />

      <AddTransactionButton onPress={() => editing.openEditor(null)} />

      <TransactionSheet
        {...sheetProps}
        editing={editing}
        events={events}
        records={records}
        rules={rules}
      />
    </View>
  );
}

export const TransactionsScreen = memo(TransactionsScreenComponent);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
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
  more: {
    paddingVertical: overviewSpacing.block,
  },
});
