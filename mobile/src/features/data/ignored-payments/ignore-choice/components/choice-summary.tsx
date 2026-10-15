import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatDayHeading } from '@/features/app-shell/formatting/format-date';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

import { ignoredPaymentsCopy } from '../../ignored-payments-copy';
import type { IgnoreKind } from '../../ignore-rule';
import type { IgnoreChoiceTarget } from '../use-ignore-choice-actions';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const kindSymbols: Record<IgnoreKind, SymbolName> = {
  payment: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  outgoingTransfer: { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' },
  incomingTransfer: { ios: 'arrow.down.left', android: 'south_west', web: 'south_west' },
};

export function ChoiceSummary({ target }: { target: IgnoreChoiceTarget }) {
  const copy = useCopy(ignoredPaymentsCopy);
  const status =
    target.rule === null
      ? copy.historyCount(target.historyCount)
      : target.rule.since === undefined
        ? copy.ruleEverything
        : copy.ruleSince(formatDayHeading(new Date(target.rule.since), new Date()).toLocaleLowerCase());

  return (
    <View style={styles.summary}>
      <View accessibilityElementsHidden importantForAccessibility="no" style={styles.kindIcon}>
        <SymbolView name={kindSymbols[target.kind]} size={20} tintColor={overviewColors.textPrimary} />
      </View>
      <View style={styles.summaryCopy}>
        <AmountText accessibilityRole="header" maxFontSizeMultiplier={1.35} numberOfLines={2} style={styles.title}>
          {target.name}
        </AmountText>
        <Text maxFontSizeMultiplier={1.4} style={styles.subtitle}>
          {copy.kinds[target.kind]} · {status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
  },
  kindIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: overviewColors.surfacePressed,
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: overviewColors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
});
