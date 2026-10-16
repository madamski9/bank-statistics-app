import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import type { PlatformSymbol } from '@/features/app-shell/symbols/platform-symbol';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { premiumCopy } from '../premium-copy';

const benefitSymbols: PlatformSymbol[] = [
  { ios: 'chart.bar.xaxis', android: 'bar_chart', web: 'bar_chart' },
  { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
  { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' },
  { ios: 'bell.badge', android: 'notifications_active', web: 'notifications_active' },
  { ios: 'tag', android: 'sell', web: 'sell' },
  { ios: 'flag', android: 'flag', web: 'flag' },
  { ios: 'heart', android: 'favorite', web: 'favorite' },
];

export function PremiumBenefits({ isPremium }: { isPremium: boolean }) {
  const copy = useCopy(premiumCopy);

  return (
    <View style={styles.benefits}>
      {copy.benefits.map((benefit, index) => (
        <View
          accessible
          accessibilityLabel={`${benefit.title}. ${benefit.detail}`}
          key={benefit.title}
          style={styles.benefit}
        >
          <View style={styles.benefitIcon}>
            <SymbolView
              name={benefitSymbols[index]}
              size={18}
              tintColor={overviewColors.textPrimary}
            />
          </View>
          <View style={styles.benefitCopy}>
            <Text maxFontSizeMultiplier={1.4} style={styles.benefitTitle}>
              {benefit.title}
            </Text>
            <Text maxFontSizeMultiplier={1.5} style={styles.benefitDetail}>
              {benefit.detail}
            </Text>
          </View>
          {isPremium ? (
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              size={15}
              tintColor={overviewColors.positive}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  benefits: {
    gap: 20,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: overviewColors.surfacePressed,
  },
  benefitCopy: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  benefitDetail: {
    fontSize: 14,
    lineHeight: 19,
    color: overviewColors.textSecondary,
  },
});
