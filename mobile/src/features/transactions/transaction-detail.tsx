import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { classifyTransaction } from '@/features/classification/classify-transaction';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { useCopy } from '@/features/localization/language';

import { transactionsCopy } from './transactions-copy';
import { formatDayHeading, formatTime } from './format-date';
import {
  affectsStatistics,
  reviewPrompt,
  transactionBadge,
  transactionContext,
  transactionKindLabel,
  transactionTitle,
} from './transaction-record';

interface TransactionDetailProps {
  record: IngestionRecord;
  rules: CategorizationRule[];
  isWriting: boolean;
  writeError: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionDetail({
  record,
  rules,
  isWriting,
  writeError,
  onClose,
  onEdit,
  onDelete,
}: TransactionDetailProps) {
  const { formatAmount } = useAmountFormatting();
  const insets = useSafeAreaInsets();
  const copy = useCopy(transactionsCopy);
  const occurredAt = new Date(record.occurredAt);
  const isIncome = record.direction === 'income';
  const title = transactionTitle(record, rules);
  const badge = transactionBadge(record);
  const prompt = record.review === undefined ? null : reviewPrompt(record.review);
  const classified = classifyTransaction(record, rules);
  const amount = `${isIncome ? '+' : '−'}${formatAmount(record.amountMinor, record.currency)}`;

  const details: { label: string; value: string }[] = [
    { label: copy.detail.date, value: `${formatDayHeading(occurredAt, new Date())}, ${formatTime(occurredAt)}` },
    { label: copy.detail.kind, value: transactionKindLabel(record) },
    { label: copy.detail.category, value: classified.categoryName },
    { label: copy.detail.account, value: transactionContext(record) },
  ];

  if (classified.merchantLocation !== undefined) {
    details.push({ label: copy.detail.place, value: classified.merchantLocation });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.headerActionLabel}>
            {copy.close}
          </Text>
        </Pressable>
        <View style={styles.headerSpacer} />
        <Pressable
          accessibilityHint={copy.editHint}
          accessibilityLabel={copy.edit}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onEdit}
          style={({ pressed }) => [styles.editButton, pressed ? styles.pressed : null]}
        >
          <SymbolView
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            size={15}
            tintColor={overviewColors.background}
            weight="semibold"
          />
          <Text maxFontSizeMultiplier={1.3} style={styles.editLabel}>
            {copy.edit}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          <Text
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.3}
            minimumFontScale={0.6}
            numberOfLines={1}
            style={[
              styles.amount,
              isIncome ? styles.amountIncome : null,
              affectsStatistics(record) ? null : styles.amountHeld,
            ]}
          >
            {amount}
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
                  badge.tone === 'caution' ? styles.badgeLabelCaution : styles.badgeLabelNeutral,
                ]}
              >
                {badge.label}
              </Text>
            </View>
          ) : null}
        </View>

        {prompt !== null ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.prompt}>
            {prompt}
          </Text>
        ) : null}

        <View style={styles.card}>
          {details.map((detail, index) => (
            <View key={detail.label}>
              {index > 0 ? <View style={styles.separator} /> : null}
              <View accessible style={styles.field}>
                <Text maxFontSizeMultiplier={1.4} style={styles.fieldLabel}>
                  {detail.label}
                </Text>
                <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={styles.fieldValue}>
                  {detail.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {writeError !== null ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {writeError}
          </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: overviewSpacing.gutter,
    paddingVertical: overviewSpacing.tight,
  },
  headerAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  headerActionLabel: {
    fontSize: 16,
    color: overviewColors.textSecondary,
  },
  headerSpacer: {
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: overviewColors.textPrimary,
  },
  editLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.background,
  },
  content: {
    gap: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.block,
  },
  hero: {
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: overviewColors.textPrimary,
  },
  amountIncome: {
    color: overviewColors.positive,
  },
  amountHeld: {
    color: overviewColors.textSecondary,
  },
  badge: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeCaution: {
    backgroundColor: 'rgba(255, 196, 107, 0.16)',
  },
  badgeNeutral: {
    backgroundColor: overviewColors.surfacePressed,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeLabelCaution: {
    color: overviewColors.caution,
  },
  badgeLabelNeutral: {
    color: overviewColors.textSecondary,
  },
  prompt: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.caution,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  separator: {
    marginLeft: 14,
    height: StyleSheet.hairlineWidth,
    backgroundColor: overviewColors.hairline,
  },
  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fieldLabel: {
    width: 86,
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
    color: overviewColors.textPrimary,
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
