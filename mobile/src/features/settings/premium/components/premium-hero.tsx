import { SymbolView } from 'expo-symbols';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { premiumCopy } from '../premium-copy';
import { premiumStanding, premiumStandingDetail } from '../premium-standing';
import type { PremiumStatus } from '../use-premium';

const storeSubscriptionsUrl =
  Platform.OS === 'android'
    ? 'https://play.google.com/store/account/subscriptions'
    : 'https://apps.apple.com/account/subscriptions';

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
        {status === undefined ? copy.tagline : premiumStandingDetail(premiumStanding(status), copy)}
      </Text>
      {isPremium && status.subscription !== null ? (
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => void Linking.openURL(status.subscription?.managementUrl ?? storeSubscriptionsUrl)}
          style={({ pressed }) => [styles.manage, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.manageLabel}>
            {copy.manageSubscription}
          </Text>
        </Pressable>
      ) : null}
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
  manage: {
    minHeight: 44,
    justifyContent: 'center',
  },
  manageLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
  tagline: {
    maxWidth: 320,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: overviewColors.textSecondary,
  },
});
