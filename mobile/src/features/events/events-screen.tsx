import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import { NamePrompt } from '@/features/sheets/name-prompt';
import {
  SheetButton,
  SheetLayout,
  SheetRow,
  SheetSection,
} from '@/features/sheets/sheet-layout';
import { useCopy } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { formatShare } from '@/features/spending-overview/formatting';
import { overviewColors } from '@/features/spending-overview/overview-theme';
import { formatDayHeading } from '@/features/transactions/format-date';
import { transactionTitle } from '@/features/transactions/transaction-record';
import { impactLight } from '@/haptics';

import { summarizeEvent } from './event-summary';
import { eventsCopy } from './events-copy';
import {
  eventNameError,
  isActive,
  sortedEvents,
  type SpendingEvent,
} from './spending-event';

interface EventsScreenProps {
  events: SpendingEvent[];
  records: IngestionRecord[];
  rules: CategorizationRule[];
  initialEventId?: string | null;
  onStart: (name: string) => Promise<SpendingEvent>;
  onSave: (event: SpendingEvent) => Promise<void>;
  onEnd: (event: SpendingEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const maximumListedTransactions = 50;

export function eventPeriodLabel(event: SpendingEvent, now: Date, copy: (typeof eventsCopy)['pl']): string {
  const from = formatDayHeading(new Date(event.startedAt), now);

  return event.endedAt === undefined
    ? copy.ongoing(from)
    : copy.range(from, formatDayHeading(new Date(event.endedAt), now));
}

export function EventsScreen({
  events,
  records,
  rules,
  initialEventId = null,
  onStart,
  onSave,
  onEnd,
  onDelete,
  onClose,
}: EventsScreenProps) {
  const copy = useCopy(eventsCopy);
  const { formatAmount } = useAmountFormatting();
  const [selectedId, setSelectedId] = useState<string | null>(initialEventId);
  const [prompt, setPrompt] = useState<'start' | 'rename' | null>(null);
  const now = useMemo(() => new Date(), []);
  const ordered = useMemo(() => sortedEvents(events), [events]);
  const selected = events.find((event) => event.id === selectedId) ?? null;
  const summaries = useMemo(
    () => new Map(ordered.map((event) => [event.id, summarizeEvent(records, event, events, rules, now)])),
    [events, now, ordered, records, rules],
  );
  const summary = selected === null ? null : (summaries.get(selected.id) ?? null);

  const confirmDelete = (event: SpendingEvent) => {
    Alert.alert(copy.deleteTitle, copy.deleteBody, [
      { style: 'cancel', text: copy.cancel },
      {
        style: 'destructive',
        text: copy.deleteConfirm,
        onPress: () => {
          void onDelete(event.id).then(() => setSelectedId(null));
        },
      },
    ]);
  };

  const backButton =
    selected === null ? undefined : (
      <Pressable
        accessibilityLabel={copy.back}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setSelectedId(null)}
        style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
      >
        <SymbolView
          name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
          size={18}
          tintColor={overviewColors.textPrimary}
        />
      </Pressable>
    );

  return (
    <SheetLayout
      closeLabel={copy.close}
      leading={backButton}
      onClose={onClose}
      title={selected?.name ?? copy.title}
    >
      {selected === null || summary === null ? (
        <>
          <SheetButton
            label={copy.start}
            onPress={() => {
              impactLight();
              setPrompt('start');
            }}
            tone="primary"
          />
          {ordered.length === 0 ? (
            <Text maxFontSizeMultiplier={1.5} style={styles.empty}>
              {copy.empty}
            </Text>
          ) : (
            <SheetSection>
              {ordered.map((event, index) => {
                const eventSummary = summaries.get(event.id);

                return (
                  <SheetRow
                    detail={eventPeriodLabel(event, now, copy)}
                    isFirst={index === 0}
                    key={event.id}
                    label={event.name}
                    onPress={() => setSelectedId(event.id)}
                    value={formatAmount(eventSummary?.expenseMinor ?? 0, reportingCurrency)}
                    valueTone={isActive(event) ? 'caution' : 'default'}
                  />
                );
              })}
            </SheetSection>
          )}
        </>
      ) : (
        <>
          <View style={styles.hero}>
            <Text maxFontSizeMultiplier={1.4} style={styles.period}>
              {eventPeriodLabel(selected, now, copy)}
            </Text>
            <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.amount}>
              {formatAmount(summary.expenseMinor, reportingCurrency)}
            </Text>
            <Text maxFontSizeMultiplier={1.4} style={styles.meta}>
              {copy.days(summary.days)} · {copy.transactionsCount(summary.count)}
            </Text>
          </View>

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

          <View style={styles.actions}>
            {isActive(selected) ? (
              <SheetButton label={copy.end} onPress={() => void onEnd(selected)} tone="primary" />
            ) : null}
            <SheetButton label={copy.rename} onPress={() => setPrompt('rename')} />
            <SheetButton label={copy.delete} onPress={() => confirmDelete(selected)} tone="danger" />
          </View>
        </>
      )}

      <NamePrompt
        cancelLabel={copy.cancel}
        confirmLabel={prompt === 'start' ? copy.start : copy.save}
        initialValue={prompt === 'rename' ? (selected?.name ?? '') : ''}
        message={prompt === 'start' ? copy.startMessage : undefined}
        onCancel={() => setPrompt(null)}
        onConfirm={async (name) => {
          if (prompt === 'start') {
            const started = await onStart(name);
            setSelectedId(started.id);
          } else if (selected !== null) {
            await onSave({ ...selected, name });
          }

          setPrompt(null);
        }}
        placeholder={copy.namePlaceholder}
        title={prompt === 'start' ? copy.startTitle : copy.renameTitle}
        validate={eventNameError}
        visible={prompt !== null}
      />
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 36,
    height: 44,
    justifyContent: 'center',
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  hero: {
    gap: 4,
  },
  period: {
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  actions: {
    gap: 10,
  },
  pressed: {
    opacity: 0.6,
  },
});
