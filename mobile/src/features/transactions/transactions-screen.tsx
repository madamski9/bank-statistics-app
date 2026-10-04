import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import type { CustomCategory } from '@/features/classification/categories';
import { eventTint } from '@/features/events/event-colors';
import { eventsCopy } from '@/features/events/events-copy';
import { eventIdForRecord, type SpendingEvent } from '@/features/events/spending-event';
import type { FinancialAccount } from '@/features/financial-accounts/financial-account';
import { AmountText } from '@/features/privacy/amount-text';
import { PrivacyShield } from '@/features/privacy/privacy-shield';
import { impactLight } from '@/haptics';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import {
  overviewColors,
  overviewSpacing,
} from '@/features/spending-overview/overview-theme';
import { useCopy } from '@/features/localization/language';

import { transactionsCopy } from './transactions-copy';
import { formatTime } from './format-date';
import { buildSections } from './history-sections';
import { confirmedRecord } from './manual-transaction';
import { TransactionDetail } from './transaction-detail';
import { TransactionEditor } from './transaction-editor';
import { transactionKindSymbols } from './transaction-kind-symbols';
import {
  affectsStatistics,
  transactionBadge,
  transactionContext,
  transactionKind,
  transactionTitle,
} from './transaction-record';
import { useTransactionWrites } from './use-transaction-writes';

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
  onRequirePremium: () => void;
}

type EditorTarget =
  | { mode: 'detail'; record: IngestionRecord }
  | { mode: 'edit'; record: IngestionRecord | null };

function TransactionsScreenComponent({
  records,
  accounts,
  onCreateAccount,
  rules,
  error,
  isLoading,
  onChanged,
  onRememberRule,
  events,
  customCategories,
  canCreateCategory,
  canRememberRule,
  onCreateCategory,
  onRequirePremium,
}: TransactionsScreenProps) {
  const { formatAmount } = useAmountFormatting();
  const insets = useSafeAreaInsets();
  const copy = useCopy(transactionsCopy);
  const eventCopy = useCopy(eventsCopy);
  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const sections = useMemo(() => buildSections(records, new Date(), events), [events, records]);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const { clearError, error: writeError, isWriting, remove, save } = useTransactionWrites(onChanged);

  const closeEditor = useCallback(() => {
    clearError();
    setEditor(null);
  }, [clearError]);

  const handleSubmit = useCallback(
    (record: IngestionRecord, { rememberCategory } = { rememberCategory: false }) => {
      void save(record).then(async (saved) => {
        if (!saved) {
          return;
        }

        if (rememberCategory && record.merchant !== undefined && record.category !== undefined) {
          try {
            await onRememberRule(record.merchant, record.category);
          } catch {
            Alert.alert(
              copy.ruleNotSavedTitle,
              copy.ruleNotSavedBody,
            );
          }
        }

        closeEditor();
      });
    },
    [closeEditor, copy, onRememberRule, save],
  );

  const handleConfirm = useCallback(() => {
    const target = editor?.record;

    if (target === null || target === undefined) {
      return;
    }

    handleSubmit(confirmedRecord(target));
  }, [editor, handleSubmit]);

  const handleDelete = useCallback(() => {
    const target = editor?.record;

    if (target === null || target === undefined) {
      return;
    }

    Alert.alert(copy.deleteTitle, copy.deleteBody, [
      { style: 'cancel', text: copy.cancel },
      {
        style: 'destructive',
        text: copy.deleteConfirm,
        onPress: () => {
          void remove(target.id).then((removed) => {
            if (removed) {
              closeEditor();
            }
          });
        },
      },
    ]);
  }, [closeEditor, copy, editor, remove]);

  const emptyMessage =
    error !== null
      ? error
      : Platform.OS !== 'ios'
        ? copy.captureIosOnly
        : isLoading
          ? copy.loading
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        indicatorStyle="white"
        keyExtractor={(row) => row.key}
        renderItem={({ item: row }) => {
          if (row.kind === 'marker') {
            const markerTint = eventTint(row.event);
            const markerLabel =
              row.boundary === 'start' ? eventCopy.markerStart(row.event.name) : eventCopy.markerEnd(row.event.name);

            return (
              <View accessible accessibilityLabel={markerLabel} style={styles.marker}>
                <View style={[styles.markerLine, { backgroundColor: markerTint.film }]} />
                <Text
                  maxFontSizeMultiplier={1.4}
                  numberOfLines={1}
                  style={[styles.markerLabel, { color: markerTint.film }]}
                >
                  {markerLabel}
                </Text>
                <View style={[styles.markerLine, { backgroundColor: markerTint.film }]} />
              </View>
            );
          }

          const item = row.record;
          const occurredAt = new Date(item.occurredAt);
          const isIncome = item.direction === 'income';
          const isCounted = affectsStatistics(item);
          const badge = transactionBadge(item);
          const label = transactionTitle(item, rules);
          const context = transactionContext(item);
          const amount = `${isIncome ? '+' : '−'}${formatAmount(item.amountMinor, item.currency)}`;
          const eventId = eventsById.size === 0 ? null : eventIdForRecord(item, events);
          const event = eventId === null ? undefined : eventsById.get(eventId);
          const tint = event === undefined ? null : eventTint(event);

          return (
            <Pressable
              accessibilityHint={copy.rowHint}
              accessibilityLabel={[
                label,
                amount,
                context,
                formatTime(occurredAt),
                badge?.label,
                event === undefined ? undefined : eventCopy.inEvent(event.name),
              ]
                .filter((part) => part !== undefined)
                .join(', ')}
              accessibilityRole="button"
              onPress={() => setEditor({ mode: 'detail', record: item })}
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            >
              <View
                style={[
                  styles.icon,
                  tint === null
                    ? null
                    : { borderColor: tint.film, backgroundColor: `rgba(${tint.rgb}, 0.16)` },
                ]}
              >
                <SymbolView
                  name={transactionKindSymbols[transactionKind(item)]}
                  size={17}
                  tintColor={tint?.film ?? overviewColors.textSecondary}
                />
              </View>
              <View style={styles.body}>
                <View style={styles.labelRow}>
                  <AmountText maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.label}>
                    {label}
                  </AmountText>
                  {badge !== null ? (
                    <View
                      style={[
                        styles.badge,
                        badge.tone === 'caution' ? styles.badgeCaution : styles.badgeNeutral,
                      ]}
                    >
                      <AmountText
                        maxFontSizeMultiplier={1.3}
                        style={[
                          styles.badgeLabel,
                          badge.tone === 'caution'
                            ? styles.badgeLabelCaution
                            : styles.badgeLabelNeutral,
                        ]}
                      >
                        {badge.label}
                      </AmountText>
                    </View>
                  ) : null}
                </View>
                <AmountText maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.meta}>
                  {formatTime(occurredAt)} · {context}
                </AmountText>
              </View>
              <AmountText
                maxFontSizeMultiplier={1.6}
                style={[
                  styles.amount,
                  isIncome ? styles.amountIncome : null,
                  isCounted ? null : styles.amountHeld,
                ]}
              >
                {amount}
              </AmountText>
            </Pressable>
          );
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text maxFontSizeMultiplier={1.6} style={styles.sectionTitle}>
              {section.title}
            </Text>
            {section.currency === null ? null : (
              <AmountText maxFontSizeMultiplier={1.6} style={styles.sectionTotal}>
                {section.totalMinor < 0 ? '−' : '+'}
                {formatAmount(section.totalMinor, section.currency)}
              </AmountText>
            )}
          </View>
        )}
        sections={sections}
        stickySectionHeadersEnabled
        style={styles.list}
      />

      <Pressable
        accessibilityHint={copy.addHint}
        accessibilityLabel={copy.add}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          impactLight();
          setEditor({ mode: 'edit', record: null });
        }}
        style={({ pressed }) => [
          styles.addButton,
          { bottom: insets.bottom + 24 },
          pressed ? styles.pressed : null,
        ]}
      >
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={19}
          tintColor={overviewColors.background}
        />
      </Pressable>

      <Modal
        animationType="slide"
        backdropColor={overviewColors.background}
        onRequestClose={closeEditor}
        presentationStyle="pageSheet"
        visible={editor !== null}
      >
        {editor === null ? null : editor.mode === 'detail' ? (
          <TransactionDetail
            isWriting={isWriting}
            onClose={closeEditor}
            onDelete={handleDelete}
            onEdit={() => setEditor({ mode: 'edit', record: editor.record })}
            events={events}
            record={editor.record}
            rules={rules}
            writeError={writeError}
          />
        ) : (
          <TransactionEditor
            accounts={accounts}
            canCreateCategory={canCreateCategory}
            canRememberRule={canRememberRule}
            customCategories={customCategories}
            events={events}
            isWriting={isWriting}
            key={editor.record?.id ?? 'new'}
            onCancel={() => {
              clearError();
              setEditor(editor.record === null ? null : { mode: 'detail', record: editor.record });
            }}
            onCreateAccount={onCreateAccount}
            onCreateCategory={onCreateCategory}
            onRequirePremium={() => {
              closeEditor();
              onRequirePremium();
            }}
            onConfirm={editor.record?.review === undefined ? undefined : handleConfirm}
            onDelete={editor.record !== null ? handleDelete : undefined}
            onSubmit={handleSubmit}
            record={editor.record}
            writeError={writeError}
          />
        )}
        <PrivacyShield />
      </Modal>
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
  marker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  markerLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    opacity: 0.8,
  },
  markerLabel: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 14,
  },
  rowPressed: {
    backgroundColor: overviewColors.surface,
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  badgeCaution: {
    backgroundColor: 'rgba(255, 196, 107, 0.16)',
  },
  badgeNeutral: {
    backgroundColor: overviewColors.surfacePressed,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeLabelCaution: {
    color: overviewColors.caution,
  },
  badgeLabelNeutral: {
    color: overviewColors.textSecondary,
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
  amountHeld: {
    color: overviewColors.textSecondary,
  },
  addButton: {
    position: 'absolute',
    right: overviewSpacing.gutter,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
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
