import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SpendingDimension, SpendingGroup } from '@/features/classification/spending-groups';
import { AmountText } from '@/features/privacy/amount-text';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { formatShare } from '@/features/spending-overview/formatting';
import { bubbleTints, overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { periodOption, type SpendingPeriod } from '@/features/spending-overview/periods';
import { RangeSwitcher } from '@/features/spending-overview/range-switcher';
import { useCopy } from '@/features/localization/language';

import { merchantsCopy } from './merchants-copy';
import { DimensionSwitcher } from './dimension-switcher';
import { groupCount, transactionCount } from './group-counts';

interface MerchantsScreenProps {
  groups: SpendingGroup[];
  dimension: SpendingDimension;
  onChangeDimension: (dimension: SpendingDimension) => void;
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  lockedPeriods: ReadonlySet<SpendingPeriod>;
  onCreateLimit: () => void;
  onCreateCategory: () => void;
  onSelectGroup: (group: SpendingGroup) => void;
  error: string | null;
  isLoading: boolean;
}

interface HeaderActionProps {
  label: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
}

function HeaderAction({ label, accessibilityLabel, accessibilityHint, onPress }: HeaderActionProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      onPress={onPress}
      style={({ pressed }) => [styles.limitAction, pressed ? styles.limitActionPressed : null]}
    >
      <SymbolView
        name={{ ios: 'plus', android: 'add', web: 'add' }}
        size={12}
        tintColor={overviewColors.textPrimary}
        weight="semibold"
      />
      <AmountText maxFontSizeMultiplier={1.3} style={styles.limitActionLabel}>
        {label}
      </AmountText>
    </Pressable>
  );
}

/** Where the money actually goes: shops, people and categories, biggest spend first. */
function MerchantsScreenComponent({
  groups,
  dimension,
  onChangeDimension,
  period,
  onChangePeriod,
  lockedPeriods,
  onCreateLimit,
  onCreateCategory,
  onSelectGroup,
  error,
  isLoading,
}: MerchantsScreenProps) {
  const { formatAmount } = useAmountFormatting();
  const insets = useSafeAreaInsets();
  const copy = useCopy(merchantsCopy);
  const option = periodOption(period);
  const tint = bubbleTints.expense;

  const emptyMessage =
    error !== null
      ? error
      : Platform.OS !== 'ios'
        ? copy.captureIosOnly
        : isLoading
          ? copy.loading
          : copy.empty[dimension];

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.contextRow}>
          <AmountText maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.context}>
            {groupCount(groups.length, dimension)} · {option.label}
          </AmountText>
          <View style={styles.headerActions}>
            <HeaderAction
              accessibilityHint={copy.createCategoryHint}
              accessibilityLabel={copy.createCategoryLabel}
              label={copy.category}
              onPress={onCreateCategory}
            />
            <HeaderAction
              accessibilityHint={copy.createLimitHint}
              accessibilityLabel={copy.createLimitLabel}
              label={copy.limit}
              onPress={onCreateLimit}
            />
          </View>
        </View>
        <RangeSwitcher lockedPeriods={lockedPeriods} onChange={onChangePeriod} period={period} />
        <DimensionSwitcher dimension={dimension} onChange={onChangeDimension} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        indicatorStyle="white"
      >
        {groups.length === 0 ? (
          <Text
            maxFontSizeMultiplier={1.6}
            style={[styles.empty, error !== null ? styles.error : null]}
          >
            {emptyMessage}
          </Text>
        ) : (
          groups.map((group, index) => (
            <Pressable
              accessibilityHint={copy.groupHint}
              accessibilityLabel={`${index + 1}. ${group.name}, ${formatAmount(group.totalMinor, group.currency)}, ${transactionCount(group.count, dimension)}, ${copy.shareOfSpending(formatShare(group.share))}`}
              accessibilityRole="button"
              key={group.key}
              onPress={() => onSelectGroup(group)}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.rank}>
                {index + 1}
              </Text>
              <View style={styles.body}>
                <View style={styles.heading}>
                  <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.name}>
                    {group.name}
                  </Text>
                  <AmountText maxFontSizeMultiplier={1.6} style={styles.amount}>
                    {formatAmount(group.totalMinor, group.currency)}
                  </AmountText>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.max(group.share * 100, 2)}%`,
                        backgroundColor: tint.film,
                      },
                    ]}
                  />
                </View>
                <AmountText maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.meta}>
                  {transactionCount(group.count, dimension)} · {copy.shareOfSpending(formatShare(group.share))}
                  {group.subtitle !== undefined ? ` · ${group.subtitle}` : ''}
                </AmountText>
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
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  context: {
    flexShrink: 1,
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  limitAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surfacePressed,
  },
  limitActionPressed: {
    opacity: 0.6,
  },
  limitActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textPrimary,
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
