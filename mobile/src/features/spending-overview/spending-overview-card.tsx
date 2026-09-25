import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { useTheme, type Theme } from '@/theme';

import { formatShare, formatTransactionCount } from './formatting';
import { periodLabel, periodWindow, type SpendingPeriod } from './periods';
import { summarizeSpending, type SpendingSourceKind } from './spending-summary';
import { useCapturedSpending } from './use-captured-spending';

const periodOptions: { value: SpendingPeriod; label: string }[] = [
  { value: 'month', label: '30 dni' },
  { value: 'all', label: 'Wszystko' },
];

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

export function SpendingOverviewCard() {
  const { formatAmount, formatSignedAmount } = useAmountFormatting();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [period, setPeriod] = useState<SpendingPeriod>('month');
  const { error, isLoading, records } = useCapturedSpending();
  const reference = useMemo(() => new Date(), []);
  const summary = useMemo(
    () => summarizeSpending(records, periodWindow(period, reference)),
    [period, records, reference],
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLabels}>
          <Text style={styles.sectionLabel}>Wydatki</Text>
          <Text style={styles.periodLabel}>{periodLabel(period)}</Text>
        </View>
        <View accessibilityRole="tablist" style={styles.periodSwitch}>
          {periodOptions.map((option) => {
            const isSelected = option.value === period;

            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                hitSlop={8}
                key={option.value}
                onPress={() => setPeriod(option.value)}
                style={({ pressed }) => [
                  styles.periodOption,
                  isSelected ? styles.periodOptionSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.periodOptionText,
                    isSelected ? styles.periodOptionTextSelected : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.total}>{formatAmount(summary.expenseMinor, summary.currency)}</Text>

      <View style={styles.flowRow}>
        <View
          accessible
          accessibilityLabel={`Przychody ${formatAmount(summary.incomeMinor, summary.currency)}`}
          style={styles.flowStat}
        >
          <Text style={styles.flowLabel}>Przychody</Text>
          <Text style={[styles.flowValue, { color: theme.income }]}>
            {formatAmount(summary.incomeMinor, summary.currency)}
          </Text>
        </View>
        <View style={styles.flowSeparator} />
        <View
          accessible
          accessibilityLabel={`Bilans, przychody minus wydatki, ${formatSignedAmount(
            summary.netMinor,
            summary.currency,
          )}`}
          style={styles.flowStat}
        >
          <Text style={styles.flowLabel}>Bilans</Text>
          <Text
            style={[
              styles.flowValue,
              { color: summary.netMinor < 0 ? theme.expense : theme.income },
            ]}
          >
            {formatSignedAmount(summary.netMinor, summary.currency)}
          </Text>
          <Text style={styles.flowCaption}>przychody − wydatki</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Na co idą pieniądze</Text>

      {error !== null ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS !== 'ios' ? (
        <Text style={styles.hint}>Przechwytywanie powiadomień działa na razie tylko na iOS.</Text>
      ) : isLoading && records.length === 0 ? (
        <Text style={styles.hint}>Wczytywanie…</Text>
      ) : summary.expenseCount === 0 ? (
        <Text style={styles.hint}>
          {period === 'month'
            ? 'Brak wydatków w tym miesiącu. Przełącz na „Wszystko”, aby zobaczyć wcześniejsze.'
            : 'Nie przechwycono jeszcze żadnego wydatku. Skonfiguruj automatyzację powiadomień w aplikacji Skróty.'}
        </Text>
      ) : (
        <View style={styles.sourceList}>
          {summary.sources.map((source) => (
            <View
              accessible
              accessibilityLabel={`${source.label}, ${formatAmount(
                source.amountMinor,
                summary.currency,
              )}, ${formatShare(source.share)} wydatków, ${formatTransactionCount(source.count)}`}
              key={source.key}
              style={styles.sourceRow}
            >
              <View style={styles.sourceIcon}>
                <SymbolView
                  name={sourceSymbols[source.kind]}
                  size={18}
                  tintColor={theme.textSecondary}
                />
              </View>
              <View style={styles.sourceBody}>
                <View style={styles.sourceHeading}>
                  <Text numberOfLines={1} style={styles.sourceLabel}>
                    {source.label}
                  </Text>
                  <Text style={styles.sourceAmount}>
                    {formatAmount(source.amountMinor, summary.currency)}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, { width: `${Math.max(source.share * 100, 2)}%` }]}
                  />
                </View>
                <Text style={styles.sourceMeta}>
                  {formatShare(source.share)} · {formatTransactionCount(source.count)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {summary.accounts.length > 0 ? (
        <Text style={styles.footnote}>Dane z: {summary.accounts.join(', ')}</Text>
      ) : null}

      {summary.skippedCurrencies.length > 0 ? (
        <Text style={styles.footnote}>
          Pominięto transakcje w walutach {summary.skippedCurrencies.join(', ')} - przeliczanie na{' '}
          {summary.currency} dojdzie później.
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 440,
      gap: 16,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      padding: 20,
      backgroundColor: theme.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerLabels: {
      flexShrink: 1,
      gap: 2,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    periodLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    periodSwitch: {
      flexDirection: 'row',
      gap: 4,
      borderRadius: 12,
      padding: 3,
      backgroundColor: theme.surfaceMuted,
    },
    periodOption: {
      minHeight: 36,
      justifyContent: 'center',
      borderRadius: 9,
      paddingHorizontal: 12,
    },
    periodOptionSelected: {
      backgroundColor: theme.surfaceSelected,
    },
    periodOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    periodOptionTextSelected: {
      color: theme.textPrimary,
    },
    pressed: {
      opacity: 0.6,
    },
    total: {
      fontSize: 40,
      fontWeight: '700',
      letterSpacing: -0.8,
      color: theme.textPrimary,
    },
    flowRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 16,
    },
    flowStat: {
      flex: 1,
      gap: 2,
    },
    flowSeparator: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
    },
    flowLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    flowValue: {
      fontSize: 18,
      fontWeight: '600',
    },
    flowCaption: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    sourceList: {
      gap: 16,
    },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    sourceIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: theme.surfaceMuted,
    },
    sourceBody: {
      flex: 1,
      gap: 6,
    },
    sourceHeading: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    sourceLabel: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '500',
      color: theme.textPrimary,
    },
    sourceAmount: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    barTrack: {
      height: 6,
      overflow: 'hidden',
      borderRadius: 3,
      backgroundColor: theme.surfaceMuted,
    },
    barFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: theme.expense,
    },
    sourceMeta: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    hint: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.textSecondary,
    },
    error: {
      fontSize: 13,
      color: theme.danger,
    },
    footnote: {
      fontSize: 12,
      lineHeight: 17,
      color: theme.textSecondary,
    },
  });
}
