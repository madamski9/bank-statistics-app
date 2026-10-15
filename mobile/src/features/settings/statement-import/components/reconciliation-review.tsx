import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { transactionsCopy } from '@/features/home/transactions/transactions-copy';

import { displayDate } from '../display-date';
import { statementImportCopy } from '../statement-import-copy';
import type { StatementImportState } from '../use-statement-import';
import { PrimaryImportButton, SecondaryImportButton } from './import-buttons';
import { importStyles } from './import-styles';
import { MissingRow } from './missing-row';

type ReviewingState = Extract<StatementImportState, { step: 'reviewing' }>;

interface ReconciliationReviewProps {
  state: ReviewingState;
  onToggle: (key: string) => void;
  onAdd: () => void;
  onChooseAnother: () => void;
}

export function ReconciliationReview({ state, onToggle, onAdd, onChooseAnother }: ReconciliationReviewProps) {
  const copy = useCopy(statementImportCopy);
  const transactions = useCopy(transactionsCopy);
  const { reconciliation, bank, skippedCount, selectedKeys, isSaving, saveFailed } = state;
  const missing = reconciliation.rows.filter((row) => row.match === null);
  const total = reconciliation.rows.length;

  return (
    <>
      <View style={importStyles.section}>
        <Text maxFontSizeMultiplier={1.4} style={importStyles.sectionLabel}>
          {copy.detectedBank(transactions.banks[bank])}
          {' · '}
          {copy.period(displayDate(reconciliation.firstDate), displayDate(reconciliation.lastDate))}
        </Text>
        <View style={[importStyles.card, styles.summary]}>
          <Text maxFontSizeMultiplier={1.4} style={styles.summaryLabel}>
            {copy.coverageTitle}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.summaryValue}>
            {copy.coverage(reconciliation.capturedCount, total, reconciliation.coveragePercent)}
          </Text>
          {reconciliation.addedCount > 0 ? (
            <Text maxFontSizeMultiplier={1.5} style={importStyles.footnote}>
              {copy.alreadyAdded(reconciliation.addedCount)}
            </Text>
          ) : null}
          {skippedCount > 0 ? (
            <Text maxFontSizeMultiplier={1.5} style={importStyles.footnote}>
              {copy.skipped(skippedCount)}
            </Text>
          ) : null}
        </View>
      </View>

      {missing.length === 0 ? (
        <Text maxFontSizeMultiplier={1.5} style={importStyles.body}>
          {copy.allPresent}
        </Text>
      ) : (
        <View style={importStyles.section}>
          <Text maxFontSizeMultiplier={1.4} style={importStyles.sectionLabel}>
            {copy.missingSection}
          </Text>
          <View style={importStyles.card}>
            {missing.map((item) => (
              <MissingRow
                isSelected={selectedKeys.has(item.key)}
                item={item}
                key={item.key}
                onToggle={onToggle}
              />
            ))}
          </View>
          <Text maxFontSizeMultiplier={1.5} style={importStyles.footnote}>
            {saveFailed ? copy.addFailed : copy.missingFootnote}
          </Text>
          <PrimaryImportButton
            isDimmed={selectedKeys.size === 0}
            isDisabled={isSaving || selectedKeys.size === 0}
            label={isSaving ? copy.adding : copy.add(selectedKeys.size)}
            onPress={onAdd}
          />
        </View>
      )}

      <SecondaryImportButton isDisabled={isSaving} label={copy.chooseAnother} onPress={onChooseAnother} />
    </>
  );
}

const styles = StyleSheet.create({
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
});
