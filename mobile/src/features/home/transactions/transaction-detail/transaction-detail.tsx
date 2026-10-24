import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { IgnoreChoice, type IgnoreChoiceTarget } from '@/features/data/ignored-payments/ignore-choice/ignore-choice';
import {
  historyCount,
  ignoreTargetFor,
  ruleFor,
  type IgnoreRule,
  type IgnoreTarget,
} from '@/features/data/ignored-payments/ignore-rule';
import type { SpendingEvent } from '@/features/insights/events/spending-event';

import { reviewPrompt } from '../record/transaction-record';
import { transactionsCopy } from '../transactions-copy';
import { DetailHeader } from './components/detail-header';
import { DetailRowsCard } from './components/detail-rows-card';
import { IgnorePaymentButton } from './components/ignore-payment-button';
import { MerchantHistoryChart } from './components/merchant-history-chart';
import { TransactionHero } from './components/transaction-hero';
import { merchantSpendHistory } from './merchant-spend-history';
import { useDetailRows } from './use-detail-rows';

interface TransactionDetailProps {
  record: IngestionRecord;
  rules: CategorizationRule[];
  events?: SpendingEvent[];
  isWriting: boolean;
  writeError: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  history: IngestionRecord[];
  ignoreRules: IgnoreRule[];
  onIgnore: (rule: IgnoreRule) => Promise<void>;
  onStopIgnoring: (target: IgnoreTarget) => Promise<void>;
}

export function TransactionDetail({
  record,
  rules,
  events = [],
  isWriting,
  writeError,
  onClose,
  onEdit,
  onDelete,
  history,
  ignoreRules,
  onIgnore,
  onStopIgnoring,
}: TransactionDetailProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(transactionsCopy);
  const ignoreTarget = ignoreTargetFor(record);
  const activeIgnoreRule = ignoreTarget === null ? null : ruleFor(ignoreRules, ignoreTarget);
  const [ignoreChoice, setIgnoreChoice] = useState<IgnoreChoiceTarget | null>(null);
  const prompt = record.review === undefined ? null : reviewPrompt(record.review);
  const details = useDetailRows(record, rules, events);
  const [openedAtMs] = useState(() => Date.now());
  const spendHistory = useMemo(
    () => merchantSpendHistory(record, history, rules, openedAtMs),
    [history, openedAtMs, record, rules],
  );

  return (
    <View style={styles.screen}>
      <DetailHeader onClose={onClose} onEdit={onEdit} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <TransactionHero record={record} rules={rules} />

        {prompt !== null ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.prompt}>
            {prompt}
          </Text>
        ) : null}

        <DetailRowsCard rows={details} />

        {spendHistory !== null ? (
          <MerchantHistoryChart
            history={spendHistory}
            key={`${record.id}-${spendHistory.highlightedKey ?? 'none'}`}
          />
        ) : null}

        {writeError !== null ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {writeError}
          </Text>
        ) : null}

        {ignoreTarget !== null ? (
          <IgnorePaymentButton
            isDisabled={isWriting}
            isIgnoring={activeIgnoreRule !== null}
            onPress={() =>
              setIgnoreChoice({
                ...ignoreTarget,
                match: activeIgnoreRule?.match ?? 'exact',
                rule: activeIgnoreRule,
                historyCount: historyCount(history, ignoreTarget),
              })
            }
            target={ignoreTarget}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isWriting}
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.deleteLabel}>
            {copy.delete}
          </Text>
        </Pressable>
      </ScrollView>

      <IgnoreChoice
        onDismiss={() => setIgnoreChoice(null)}
        onDone={(outcome) => {
          setIgnoreChoice(null);

          if (outcome === 'everything') {
            onClose();
          }
        }}
        onIgnore={onIgnore}
        onStopIgnoring={onStopIgnoring}
        target={ignoreChoice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  content: {
    gap: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.block,
  },
  prompt: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.caution,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.negative,
  },
  deleteButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 92, 122, 0.35)',
    backgroundColor: 'rgba(255, 92, 122, 0.08)',
  },
  deleteLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.negative,
  },
  pressed: {
    opacity: 0.6,
  },
});
