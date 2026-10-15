import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { premiumCopy } from '../premium-copy';

const benefitSymbols: SFSymbol[] = [
  'chart.bar.xaxis',
  'chart.line.uptrend.xyaxis',
  'square.grid.2x2',
  'bell.badge',
  'tag',
  'flag',
  'heart',
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
              name={{ ios: benefitSymbols[index], android: 'check', web: 'check' }}
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
