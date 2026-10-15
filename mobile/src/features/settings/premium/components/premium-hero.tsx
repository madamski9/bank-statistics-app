import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { premiumCopy } from '../premium-copy';
import { formatPremiumDate } from '../premium-date';
import type { PremiumStatus } from '../use-premium';

export function PremiumHero({ status }: { status: PremiumStatus | undefined }) {
  const copy = useCopy(premiumCopy);
  const isPremium = status?.isPremium === true;

  return (
    <View style={styles.hero}>
      <View accessibilityElementsHidden importantForAccessibility="no" style={styles.heroBadge}>
        <SymbolView
          name={{ ios: isPremium ? 'checkmark.seal.fill' : 'sparkles', android: 'star', web: 'star' }}
          size={34}
          tintColor={overviewColors.textPrimary}
        />
      </View>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
        {isPremium ? copy.youHavePremium : 'BankStats Premium'}
      </Text>
      <Text maxFontSizeMultiplier={1.5} style={styles.tagline}>
        {isPremium
          ? status.premiumUntil !== null
            ? copy.activeUntilLong(formatPremiumDate(status.premiumUntil))
            : status.premiumSince === null
              ? copy.thanksLong
              : copy.activeSinceLong(formatPremiumDate(status.premiumSince))
          : copy.tagline}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 12,
    paddingTop: overviewSpacing.tight,
  },
  heroBadge: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    marginBottom: 6,
    experimental_backgroundImage: 'linear-gradient(135deg, #FF5C8A 0%, #8F7BFF 100%)',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    textAlign: 'center',
    color: overviewColors.textPrimary,
  },
  tagline: {
    maxWidth: 320,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: overviewColors.textSecondary,
  },
});
