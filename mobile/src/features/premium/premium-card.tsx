import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/localization/language';
import { overviewColors } from '@/features/spending-overview/overview-theme';

import { premiumCopy } from './premium-copy';
import { formatPremiumSince } from './premium-date';
import type { PremiumStatus } from './use-premium';

interface PremiumCardProps {
  status: PremiumStatus | undefined;
  onPress: () => void;
}

export function PremiumCard({ status, onPress }: PremiumCardProps) {
  const copy = useCopy(premiumCopy);
  const isPremium = status?.isPremium === true;
  const subtitle = isPremium
    ? status.premiumSince === null
      ? copy.thanks
      : copy.activeSince(formatPremiumSince(status.premiumSince))
    : copy.pitch;

  return (
    <Pressable
      accessibilityHint={isPremium ? copy.detailsHint : copy.pitchHint}
      accessibilityLabel={copy.cardLabel(isPremium, subtitle)}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View accessibilityElementsHidden importantForAccessibility="no" style={styles.badge}>
        <SymbolView
          name={{ ios: isPremium ? 'checkmark.seal.fill' : 'sparkles', android: 'star', web: 'star' }}
          size={20}
          tintColor={overviewColors.textPrimary}
        />
      </View>
      <View style={styles.copy}>
        <Text maxFontSizeMultiplier={1.35} style={styles.title}>
          {isPremium ? copy.youHavePremium : 'BankStats Premium'}
        </Text>
        <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      {isPremium ? (
        <SymbolView
          accessibilityElementsHidden
          importantForAccessibility="no"
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={17}
          tintColor={overviewColors.textSecondary}
        />
      ) : (
        <View style={styles.cta}>
          <Text maxFontSizeMultiplier={1.3} style={styles.ctaLabel}>
            {copy.see}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 92, 138, 0.35)',
    backgroundColor: overviewColors.surface,
    experimental_backgroundImage:
      'linear-gradient(120deg, rgba(255, 92, 138, 0.22) 0%, rgba(143, 123, 255, 0.16) 55%, rgba(13, 13, 15, 0) 100%)',
  },
  pressed: {
    opacity: 0.75,
  },
  badge: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    experimental_backgroundImage: 'linear-gradient(135deg, #FF5C8A 0%, #8F7BFF 100%)',
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  cta: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: overviewColors.textPrimary,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: overviewColors.background,
  },
});
