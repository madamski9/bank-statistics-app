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
import type { FinancialAccount } from '@/features/financial-accounts/financial-account';
import { impactLight } from '@/haptics';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import {
  overviewColors,
  overviewSpacing,
} from '@/features/spending-overview/overview-theme';
import type { SpendingSourceKind } from '@/features/spending-overview/spending-summary';
import { useCopy } from '@/features/localization/language';

import { transactionsCopy } from './transactions-copy';
import { dayKey, formatDayHeading, formatTime } from './format-date';
import { confirmedRecord } from './manual-transaction';
import { TransactionDetail } from './transaction-detail';
import { TransactionEditor } from './transaction-editor';
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
}

interface DaySection {
  key: string;
  title: string;
  totalMinor: number;
  currency: string;
  data: IngestionRecord[];
}

type EditorTarget =
  | { mode: 'detail'; record: IngestionRecord }
  | { mode: 'edit'; record: IngestionRecord | null };

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
    const countedMinor = !affectsStatistics(record)
      ? 0
      : record.direction === 'income'
        ? record.amountMinor
        : -record.amountMinor;

    if (existing === undefined) {
      sections.set(key, {
        key,
        title: formatDayHeading(occurredAt, reference),
        totalMinor: countedMinor,
        currency: record.currency,
        data: [record],
      });
      continue;
    }

    existing.data.push(record);
    existing.totalMinor += countedMinor;
  }

  return [...sections.values()];
}

/** The plain log behind the Overview: every captured transaction, newest first. */
function TransactionsScreenComponent({
  records,
  accounts,
  onCreateAccount,
  rules,
  error,
  isLoading,
  onChanged,
  onRememberRule,
}: TransactionsScreenProps) {
  const { formatAmount } = useAmountFormatting();
  const insets = useSafeAreaInsets();
  const copy = useCopy(transactionsCopy);
  const sections = useMemo(() => buildSections(records, new Date()), [records]);
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
        keyExtractor={(record) => record.id}
        renderItem={({ item }) => {
          const occurredAt = new Date(item.occurredAt);
          const isIncome = item.direction === 'income';
          const isCounted = affectsStatistics(item);
          const badge = transactionBadge(item);
          const label = transactionTitle(item, rules);
          const context = transactionContext(item);
          const amount = `${isIncome ? '+' : '−'}${formatAmount(item.amountMinor, item.currency)}`;

          return (
            <Pressable
              accessibilityHint={copy.rowHint}
              accessibilityLabel={[
                label,
                amount,
                context,
                formatTime(occurredAt),
                badge?.label,
              ]
                .filter((part) => part !== undefined)
                .join(', ')}
              accessibilityRole="button"
              onPress={() => setEditor({ mode: 'detail', record: item })}
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            >
              <View style={styles.icon}>
                <SymbolView
                  name={sourceSymbols[transactionKind(item)]}
                  size={17}
                  tintColor={overviewColors.textSecondary}
                />
              </View>
              <View style={styles.body}>
                <View style={styles.labelRow}>
                  <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.label}>
                    {label}
                  </Text>
                  {badge !== null ? (
                    <View
                      style={[
                        styles.badge,
                        badge.tone === 'caution' ? styles.badgeCaution : styles.badgeNeutral,
                      ]}
                    >
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={[
                          styles.badgeLabel,
                          badge.tone === 'caution'
                            ? styles.badgeLabelCaution
                            : styles.badgeLabelNeutral,
                        ]}
                      >
                        {badge.label}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.meta}>
                  {formatTime(occurredAt)} · {context}
                </Text>
              </View>
              <Text
                maxFontSizeMultiplier={1.6}
                style={[
                  styles.amount,
                  isIncome ? styles.amountIncome : null,
                  isCounted ? null : styles.amountHeld,
                ]}
              >
                {amount}
              </Text>
            </Pressable>
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
            record={editor.record}
            rules={rules}
            writeError={writeError}
          />
        ) : (
          <TransactionEditor
            accounts={accounts}
            isWriting={isWriting}
            key={editor.record?.id ?? 'new'}
            onCancel={() => {
              clearError();
              setEditor(editor.record === null ? null : { mode: 'detail', record: editor.record });
            }}
            onCreateAccount={onCreateAccount}
            onConfirm={editor.record?.review === undefined ? undefined : handleConfirm}
            onDelete={editor.record !== null ? handleDelete : undefined}
            onSubmit={handleSubmit}
            record={editor.record}
            writeError={writeError}
          />
        )}
      </Modal>
    </View>
  );
}

/** Memoised: swiping the pager re-renders the shell once per crossing, not this list. */
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
