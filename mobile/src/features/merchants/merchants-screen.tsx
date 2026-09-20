import { memo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatAmount, formatShare } from '@/features/spending-overview/formatting';
import { bubbleTints, overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { periodOption, type SpendingPeriod } from '@/features/spending-overview/periods';
import { RangeSwitcher } from '@/features/spending-overview/range-switcher';

import type { MerchantSpending } from './merchant-summary';

interface MerchantsScreenProps {
  merchants: MerchantSpending[];
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  onSelectMerchant: (merchant: MerchantSpending) => void;
  error: string | null;
  isLoading: boolean;
}

function polishPlural(count: number, one: string, few: string, many: string): string {
  if (count === 1) {
    return one;
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  const takesFew = lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14);

  return takesFew ? few : many;
}

function shopCount(count: number): string {
  return `${count} ${polishPlural(count, 'sklep', 'sklepy', 'sklepów')}`;
}

function purchaseCount(count: number): string {
  if (count === 1) {
    return '1 zakup';
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  const takesPluralNominative =
    lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14);

  return `${count} ${takesPluralNominative ? 'zakupy' : 'zakupów'}`;
}

/** Where the money actually goes: every shop the Wallet pushes named, biggest spend first. */
function MerchantsScreenComponent({
  merchants,
  period,
  onChangePeriod,
  onSelectMerchant,
  error,
  isLoading,
}: MerchantsScreenProps) {
  const insets = useSafeAreaInsets();
  const option = periodOption(period);
  const tint = bubbleTints.expense;

  const emptyMessage =
    error !== null
      ? error
      : Platform.OS !== 'ios'
        ? 'Przechwytywanie powiadomień działa na razie tylko na iOS.'
        : isLoading
          ? 'Wczytywanie…'
          : `Brak sklepów w okresie „${option.label}”. Nazwy sklepów przychodzą z powiadomień Portfela — wybierz Max, aby zobaczyć wszystko.`;

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text maxFontSizeMultiplier={1.6} style={styles.context}>
          {shopCount(merchants.length)} · {option.label}
        </Text>
        <RangeSwitcher onChange={onChangePeriod} period={period} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        indicatorStyle="white"
      >
        {merchants.length === 0 ? (
          <Text
            maxFontSizeMultiplier={1.6}
            style={[styles.empty, error !== null ? styles.error : null]}
          >
            {emptyMessage}
          </Text>
        ) : (
          merchants.map((merchant, index) => (
            <Pressable
              accessibilityHint="Otwiera historię i wykres wydatków"
              accessibilityLabel={`${index + 1}. ${merchant.name}, ${formatAmount(merchant.totalMinor, merchant.currency)}, ${purchaseCount(merchant.count)}, ${formatShare(merchant.share)} wydatków`}
              accessibilityRole="button"
              key={merchant.key}
              onPress={() => onSelectMerchant(merchant)}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.rank}>
                {index + 1}
              </Text>
              <View style={styles.body}>
                <View style={styles.heading}>
                  <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.name}>
                    {merchant.name}
                  </Text>
                  <Text maxFontSizeMultiplier={1.6} style={styles.amount}>
                    {formatAmount(merchant.totalMinor, merchant.currency)}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.max(merchant.share * 100, 2)}%`,
                        backgroundColor: tint.film,
                      },
                    ]}
                  />
                </View>
                <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.meta}>
                  {purchaseCount(merchant.count)} · {formatShare(merchant.share)} wydatków
                  {merchant.location !== undefined ? ` · ${merchant.location}` : ''}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export const MerchantsScreen = memo(MerchantsScreenComponent);

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  header: {
    paddingHorizontal: overviewSpacing.gutter,
    gap: overviewSpacing.tight,
  },
  context: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  list: {
    gap: 4,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 44,
    borderRadius: 14,
    paddingVertical: 10,
  },
  pressed: {
    backgroundColor: overviewColors.surface,
  },
  rank: {
    width: 20,
    paddingTop: 1,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: overviewColors.textSecondary,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: overviewColors.textPrimary,
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  track: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  meta: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  empty: {
    paddingTop: overviewSpacing.block,
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  error: {
    color: overviewColors.negative,
  },
});
