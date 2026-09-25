import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

import { premiumReasonMessages, type PremiumReason } from './premium-access';
import { formatPremiumSince } from './premium-date';
import { setPreviewWithoutPremium, usePreviewWithoutPremium } from './premium-preview';
import type { PremiumStatus } from './use-premium';

interface PremiumBenefit {
  symbol: SFSymbol;
  title: string;
  detail: string;
}

const benefits: PremiumBenefit[] = [
  {
    symbol: 'chart.bar.xaxis',
    title: 'Głębsze analizy',
    detail: 'Porównania okresów i trendy w sklepach oraz kategoriach.',
  },
  {
    symbol: 'square.grid.2x2',
    title: 'Więcej widżetów',
    detail: 'Wszystkie widoki widżetów na ekranie głównym i blokady.',
  },
  {
    symbol: 'bell.badge',
    title: 'Limity bez ograniczeń',
    detail: 'Dowolna liczba limitów dla sklepów i kategorii.',
  },
  {
    symbol: 'heart',
    title: 'Wsparcie rozwoju',
    detail: 'Pomagasz rozwijać BankStats bez reklam i sprzedaży danych.',
  },
];

interface PremiumScreenProps {
  status: PremiumStatus | undefined;
  reason: PremiumReason | null;
  onClose: () => void;
}

export function PremiumScreen({ status, reason, onClose }: PremiumScreenProps) {
  const insets = useSafeAreaInsets();
  const isPremium = status?.isPremium === true;
  const isPreviewingWithoutPremium = usePreviewWithoutPremium();

  const purchase = () => {
    Alert.alert('BankStats Premium', 'Zakup Premium w aplikacji będzie dostępny wkrótce.');
  };

  return (
    <View style={[styles.screen, styles.sheetTop]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Zamknij"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
        >
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={18}
            tintColor={overviewColors.textPrimary}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {reason !== null && !isPremium ? (
          <View accessibilityLiveRegion="polite" style={styles.reason}>
            <SymbolView
              accessibilityElementsHidden
              importantForAccessibility="no"
              name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
              size={14}
              tintColor={overviewColors.textPrimary}
            />
            <Text maxFontSizeMultiplier={1.5} style={styles.reasonLabel}>
              {premiumReasonMessages[reason]}
            </Text>
          </View>
        ) : null}

        <View style={styles.hero}>
          <View accessibilityElementsHidden importantForAccessibility="no" style={styles.heroBadge}>
            <SymbolView
              name={{ ios: isPremium ? 'checkmark.seal.fill' : 'sparkles', android: 'star', web: 'star' }}
              size={34}
              tintColor={overviewColors.textPrimary}
            />
          </View>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
            {isPremium ? 'Masz Premium' : 'BankStats Premium'}
          </Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.tagline}>
            {isPremium
              ? status.premiumSince === null
                ? 'Dziękujemy, że wspierasz BankStats.'
                : `Aktywne od ${formatPremiumSince(status.premiumSince)}. Dziękujemy, że wspierasz BankStats.`
              : 'Pełny obraz Twoich wydatków, bez reklam i bez sprzedawania danych.'}
          </Text>
        </View>

        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <View
              accessible
              accessibilityLabel={`${benefit.title}. ${benefit.detail}`}
              key={benefit.title}
              style={styles.benefit}
            >
              <View style={styles.benefitIcon}>
                <SymbolView
                  name={{ ios: benefit.symbol, android: 'check', web: 'check' }}
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

        {__DEV__ && (isPremium || isPreviewingWithoutPremium) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setPreviewWithoutPremium(!isPreviewingWithoutPremium)}
            style={({ pressed }) => [styles.preview, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.previewLabel}>
              {isPreviewingWithoutPremium ? 'Wróć do Premium' : 'Podgląd bez Premium'}
            </Text>
            <Text maxFontSizeMultiplier={1.4} style={styles.previewDetail}>
              Tylko w wersji deweloperskiej. Premium na koncie się nie zmienia.
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {isPremium ? null : (
        <View style={[styles.footer, { paddingBottom: insets.bottom + overviewSpacing.block }]}>
          <Pressable
            accessibilityRole="button"
            onPress={purchase}
            style={({ pressed }) => [styles.purchase, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.purchaseLabel}>
              Kup Premium
            </Text>
          </Pressable>
          <Text maxFontSizeMultiplier={1.4} style={styles.footnote}>
            Płatność i odnawianie obsługuje App Store. Możesz zrezygnować w każdej chwili.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetTop: {
    paddingTop: 14,
  },
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: overviewSpacing.gutter,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    gap: 32,
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.section,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: overviewColors.surfacePressed,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  preview: {
    gap: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: overviewColors.textDisabled,
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  previewDetail: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
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
  footer: {
    gap: 10,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.row,
  },
  purchase: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    experimental_backgroundImage: 'linear-gradient(120deg, #FF5C8A 0%, #8F7BFF 100%)',
  },
  purchaseLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    color: overviewColors.textSecondary,
  },
});
