import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FinancialAccount } from '@/features/financial-accounts/financial-account';
import { useCopy } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { transactionsCopy } from '@/features/transactions/transactions-copy';

import { statementImportCopy } from './statement-import-copy';
import type { ReconciledRow } from './statement-reconciliation';
import { useStatementImport, type StatementImportState } from './use-statement-import';

interface StatementImportScreenProps {
  records: IngestionRecord[];
  accounts: FinancialAccount[];
  onImported: () => void | Promise<void>;
  onClose: () => void;
}

function displayDate(date: string): string {
  const [year, month, day] = date.split('-');

  return `${day}.${month}.${year}`;
}

type ReviewingState = Extract<StatementImportState, { step: 'reviewing' }>;

interface MissingRowProps {
  item: ReconciledRow;
  isSelected: boolean;
  onToggle: (key: string) => void;
}

function MissingRow({ item, isSelected, onToggle }: MissingRowProps) {
  const copy = useCopy(statementImportCopy);
  const transactions = useCopy(transactionsCopy);
  const { formatSignedAmount } = useAmountFormatting();
  const { row } = item;
  const name =
    row.party ?? (row.transactionType === undefined ? copy.noName : transactions.types[row.transactionType]);
  const signedMinor = row.direction === 'expense' ? -row.amountMinor : row.amountMinor;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onPress={() => onToggle(item.key)}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <SymbolView
        accessibilityElementsHidden
        importantForAccessibility="no"
        name={
          isSelected
            ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
            : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }
        }
        size={22}
        tintColor={isSelected ? overviewColors.positive : overviewColors.textSecondary}
      />
      <View style={styles.rowText}>
        <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.rowLabel}>
          {name}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.rowDetail}>
          {displayDate(row.date)}
        </Text>
      </View>
      <Text
        maxFontSizeMultiplier={1.4}
        style={[styles.rowAmount, row.direction === 'income' ? styles.income : null]}
      >
        {formatSignedAmount(signedMinor, row.currency)}
      </Text>
    </Pressable>
  );
}

interface ReviewProps {
  state: ReviewingState;
  onToggle: (key: string) => void;
  onAdd: () => void;
  onChooseAnother: () => void;
}

function Review({ state, onToggle, onAdd, onChooseAnother }: ReviewProps) {
  const copy = useCopy(statementImportCopy);
  const transactions = useCopy(transactionsCopy);
  const { reconciliation, bank, skippedCount, selectedKeys, isSaving, saveFailed } = state;
  const missing = reconciliation.rows.filter((row) => row.match === null);
  const total = reconciliation.rows.length;

  return (
    <>
      <View style={styles.section}>
        <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
          {copy.detectedBank(transactions.banks[bank])}
          {' · '}
          {copy.period(displayDate(reconciliation.firstDate), displayDate(reconciliation.lastDate))}
        </Text>
        <View style={[styles.card, styles.summary]}>
          <Text maxFontSizeMultiplier={1.4} style={styles.summaryLabel}>
            {copy.coverageTitle}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.summaryValue}>
            {copy.coverage(reconciliation.capturedCount, total, reconciliation.coveragePercent)}
          </Text>
          {reconciliation.addedCount > 0 ? (
            <Text maxFontSizeMultiplier={1.5} style={styles.footnote}>
              {copy.alreadyAdded(reconciliation.addedCount)}
            </Text>
          ) : null}
          {skippedCount > 0 ? (
            <Text maxFontSizeMultiplier={1.5} style={styles.footnote}>
              {copy.skipped(skippedCount)}
            </Text>
          ) : null}
        </View>
      </View>

      {missing.length === 0 ? (
        <Text maxFontSizeMultiplier={1.5} style={styles.body}>
          {copy.allPresent}
        </Text>
      ) : (
        <View style={styles.section}>
          <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
            {copy.missingSection}
          </Text>
          <View style={styles.card}>
            {missing.map((item) => (
              <MissingRow
                isSelected={selectedKeys.has(item.key)}
                item={item}
                key={item.key}
                onToggle={onToggle}
              />
            ))}
          </View>
          <Text maxFontSizeMultiplier={1.5} style={styles.footnote}>
            {saveFailed ? copy.addFailed : copy.missingFootnote}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSaving || selectedKeys.size === 0 }}
            disabled={isSaving || selectedKeys.size === 0}
            onPress={onAdd}
            style={({ pressed }) => [
              styles.primaryButton,
              selectedKeys.size === 0 ? styles.disabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.primaryLabel}>
              {isSaving ? copy.adding : copy.add(selectedKeys.size)}
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={onChooseAnother}
        style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.secondaryLabel}>
          {copy.chooseAnother}
        </Text>
      </Pressable>
    </>
  );
}

export function StatementImportScreen({
  records,
  accounts,
  onImported,
  onClose,
}: StatementImportScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(statementImportCopy);
  const { state, choose, toggle, addSelected, reset } = useStatementImport(records, accounts, onImported);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14 }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          {copy.title}
        </Text>
        <Pressable
          accessibilityLabel={copy.close}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
        >
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={18}
            tintColor={overviewColors.textPrimary}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {state.step === 'idle' || state.step === 'failed' ? (
          <>
            <Text maxFontSizeMultiplier={1.5} style={styles.body}>
              {copy.intro}
            </Text>
            {state.step === 'failed' ? (
              <Text accessibilityRole="alert" maxFontSizeMultiplier={1.5} style={styles.problem}>
                {copy.problems[state.problem]}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void choose()}
              style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.primaryLabel}>
                {copy.choose}
              </Text>
            </Pressable>
          </>
        ) : null}

        {state.step === 'reading' ? (
          <View style={styles.reading}>
            <ActivityIndicator color={overviewColors.textSecondary} />
            <Text maxFontSizeMultiplier={1.5} style={styles.body}>
              {copy.reading}
            </Text>
          </View>
        ) : null}

        {state.step === 'reviewing' ? (
          <Review
            onAdd={() => void addSelected()}
            onChooseAnother={() => {
              reset();
              void choose();
            }}
            onToggle={toggle}
            state={state}
          />
        ) : null}

        {state.step === 'finished' ? (
          <>
            <Text maxFontSizeMultiplier={1.5} style={styles.body}>
              {copy.added(state.addedCount)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.primaryLabel}>
                {copy.done}
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.gutter,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
  content: {
    gap: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.block,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: overviewColors.textSecondary,
  },
  problem: {
    fontSize: 15,
    lineHeight: 21,
    color: overviewColors.caution,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
  },
  section: {
    gap: overviewSpacing.tight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  summary: {
    gap: 6,
    padding: overviewSpacing.block,
  },
  summaryLabel: {
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
    paddingHorizontal: overviewSpacing.block,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  rowPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  rowDetail: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: overviewColors.textPrimary,
  },
  income: {
    color: overviewColors.positive,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    paddingHorizontal: overviewSpacing.block,
    backgroundColor: overviewColors.textPrimary,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.background,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
