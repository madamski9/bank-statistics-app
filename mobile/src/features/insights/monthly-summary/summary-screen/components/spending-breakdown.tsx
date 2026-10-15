import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { formatShare } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';
import { bubbleTints, overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';
import { selectionChanged } from '@/haptics';

import type { SummaryGroupSelection } from '../../group-screen/monthly-group-screen';
import type { MonthlySummary } from '../../monthly-summary';
import { monthlySummaryCopy } from '../../monthly-summary-copy';
import { reportSeriesColors } from '../../charts/report-colors';
import type { BreakdownDimension } from '../month-pages';
import { ShareRow } from './share-row';
import { summaryStyles } from './summary-styles';

interface SpendingBreakdownProps {
  summary: MonthlySummary;
  activeDimension: BreakdownDimension;
  showAllGroups: boolean;
  isActive: boolean;
  onChangeDimension: (dimension: BreakdownDimension) => void;
  onToggleShowAll: () => void;
  onSelectGroup: (selection: SummaryGroupSelection) => void;
}

export function SpendingBreakdown({
  summary,
  activeDimension,
  showAllGroups,
  isActive,
  onChangeDimension,
  onToggleShowAll,
  onSelectGroup,
}: SpendingBreakdownProps) {
  const copy = useCopy(monthlySummaryCopy);
  const { formatAmount } = useAmountFormatting();
  const groups = activeDimension === 'merchant' ? summary.merchants : summary.categories;
  const visibleGroups = showAllGroups ? groups : groups.slice(0, 5);
  const leadingMinor = groups[0]?.totalMinor ?? 0;

  return (
    <View style={summaryStyles.section}>
      <Text maxFontSizeMultiplier={1.4} style={summaryStyles.sectionLabel}>
        {copy.spendingBy.toLocaleUpperCase()}
      </Text>
      <View accessibilityRole="tablist" style={styles.dimensionSwitcher}>
        {(['merchant', 'category'] as const).map((dimension) => {
          const selected = activeDimension === dimension;
          const disabled = (dimension === 'merchant' ? summary.merchants : summary.categories).length === 0;

          return (
            <ScalePressable
              accessibilityRole="tab"
              accessibilityState={{ selected, disabled }}
              containerStyle={styles.dimensionTabContainer}
              disabled={disabled}
              key={dimension}
              onPress={() => {
                selectionChanged();
                onChangeDimension(dimension);
              }}
              style={[styles.dimensionTab, selected ? styles.dimensionSelected : null]}
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.dimensionLabel, selected ? styles.dimensionLabelSelected : null]}>
                {dimension === 'merchant' ? copy.merchants : copy.categories}
              </Text>
            </ScalePressable>
          );
        })}
      </View>
      <Animated.View
        entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
        key={activeDimension}
        style={styles.shareList}
      >
        {visibleGroups.map((group, groupIndex) => (
          <ShareRow
            accessibilityHint={copy.openGroupDetail}
            detail={copy.groupDetail(
              copy.payments(group.count),
              formatShare(summary.expenseMinor === 0 ? 0 : group.totalMinor / summary.expenseMinor),
            )}
            fraction={leadingMinor === 0 ? 0 : group.totalMinor / leadingMinor}
            group={group}
            index={groupIndex}
            isActive={isActive}
            key={group.key}
            onPress={() => {
              selectionChanged();
              onSelectGroup({ dimension: activeDimension, key: group.key, name: group.name });
            }}
            tint={activeDimension === 'category'
              ? reportSeriesColors[Math.min(groupIndex, reportSeriesColors.length - 1)]
              : bubbleTints.expense.film}
            value={formatAmount(group.totalMinor, reportingCurrency)}
          />
        ))}
        {groups.length > 5 ? (
          <ScalePressable
            accessibilityRole="button"
            onPress={() => {
              selectionChanged();
              onToggleShowAll();
            }}
            pressedScale={0.97}
            style={styles.showAllButton}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.showAllLabel}>
              {showAllGroups ? copy.showLess : copy.showAll(groups.length)}
            </Text>
          </ScalePressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dimensionTabContainer: {
    flex: 1,
  },
  dimensionSwitcher: {
    minHeight: 48,
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    backgroundColor: overviewColors.surfacePressed,
  },
  dimensionTab: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dimensionSelected: {
    backgroundColor: overviewColors.textDisabled,
  },
  dimensionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  dimensionLabelSelected: {
    color: overviewColors.textPrimary,
  },
  shareList: {
    gap: overviewSpacing.section,
    padding: overviewSpacing.block,
    borderRadius: 20,
    backgroundColor: overviewColors.surfacePressed,
  },
  showAllButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
  },
  showAllLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: bubbleTints.net.film,
  },
});
