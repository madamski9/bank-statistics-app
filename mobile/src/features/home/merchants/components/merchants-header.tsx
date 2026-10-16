import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import type { PlatformSymbol } from '@/features/app-shell/symbols/platform-symbol';
import { useCopy } from '@/features/app-shell/localization/language';
import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { SpendingDimension } from '@/features/data/classification/spending-groups';
import { periodOption, type SpendingPeriod } from '@/features/home/overview/period/periods';
import { RangeSwitcher } from '@/features/home/overview/period/range-switcher';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { selectionChanged } from '@/haptics';

import { groupCount } from '../group-counts';
import { merchantsCopy } from '../merchants-copy';
import { DimensionSwitcher } from './dimension-switcher';

const categorySymbol: PlatformSymbol = { ios: 'tag', android: 'sell', web: 'sell' };
const limitSymbol: PlatformSymbol = {
  ios: 'gauge.with.dots.needle.33percent',
  android: 'speed',
  web: 'speed',
};
const skipSymbol: PlatformSymbol = { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' };

interface MerchantsHeaderProps {
  groupTotal: number;
  dimension: SpendingDimension;
  onChangeDimension: (dimension: SpendingDimension) => void;
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  lockedPeriods: ReadonlySet<SpendingPeriod>;
  onCreateLimit: () => void;
  onOpenCategories: () => void;
  onOpenIgnoredPayments: () => void;
}

export function MerchantsHeader({
  groupTotal,
  dimension,
  onChangeDimension,
  period,
  onChangePeriod,
  lockedPeriods,
  onCreateLimit,
  onOpenCategories,
  onOpenIgnoredPayments,
}: MerchantsHeaderProps) {
  const copy = useCopy(merchantsCopy);

  return (
    <View style={styles.header}>
      <View style={styles.contextRow}>
        <AmountText maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.context}>
          {groupCount(groupTotal, dimension)} · {periodOption(period).label}
        </AmountText>
        <View style={styles.headerActions}>
          <HeaderAction
            accessibilityHint={copy.openCategoriesHint}
            accessibilityLabel={copy.openCategoriesLabel}
            onPress={onOpenCategories}
            symbol={categorySymbol}
          />
          <HeaderAction
            accessibilityHint={copy.createLimitHint}
            accessibilityLabel={copy.createLimitLabel}
            onPress={onCreateLimit}
            symbol={limitSymbol}
          />
          <HeaderAction
            accessibilityHint={copy.ignoredPaymentsHint}
            accessibilityLabel={copy.ignoredPaymentsLabel}
            onPress={onOpenIgnoredPayments}
            symbol={skipSymbol}
          />
        </View>
      </View>
      <RangeSwitcher lockedPeriods={lockedPeriods} onChange={onChangePeriod} period={period} />
      <DimensionSwitcher dimension={dimension} onChange={onChangeDimension} />
    </View>
  );
}

interface HeaderActionProps {
  symbol: PlatformSymbol;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
}

function HeaderAction({ symbol, accessibilityLabel, accessibilityHint, onPress }: HeaderActionProps) {
  return (
    <ScalePressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={4}
      onPress={() => {
        selectionChanged();
        onPress();
      }}
      pressedScale={0.88}
      style={styles.headerAction}
    >
      <SymbolView name={symbol} size={16} tintColor={overviewColors.textPrimary} weight="medium" />
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.block,
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
  headerAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surfacePressed,
  },
});
