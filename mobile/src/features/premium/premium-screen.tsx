import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/localization/language';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

import type { PremiumReason } from './premium-access';
import { PremiumCodeForm } from './premium-code-form';
import { premiumCopy } from './premium-copy';
import { formatPremiumDate } from './premium-date';
import { setPreviewWithoutPremium, usePreviewWithoutPremium } from './premium-preview';
import type { PremiumStatus } from './use-premium';

const benefitSymbols: SFSymbol[] = [
  'chart.bar.xaxis',
  'chart.line.uptrend.xyaxis',
  'square.grid.2x2',
  'bell.badge',
  'tag',
  'flag',
  'heart',
];

interface PremiumScreenProps {
  status: PremiumStatus | undefined;
  reason: PremiumReason | null;
  onClose: () => void;
}

export function PremiumScreen({ status, reason, onClose }: PremiumScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(premiumCopy);
  const isPremium = status?.isPremium === true;
  const isPreviewingWithoutPremium = usePreviewWithoutPremium();

  const purchase = () => {
    Alert.alert('BankStats Premium', copy.purchaseSoon);
  };

  return (
    <View style={[styles.screen, styles.sheetTop]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={copy.close}
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

      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
              {copy.reasons[reason]}
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

        {isPremium ? null : <PremiumCodeForm />}

        {__DEV__ && (isPremium || isPreviewingWithoutPremium) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setPreviewWithoutPremium(!isPreviewingWithoutPremium)}
            style={({ pressed }) => [styles.preview, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.previewLabel}>
              {isPreviewingWithoutPremium ? copy.previewOff : copy.previewOn}
            </Text>
            <Text maxFontSizeMultiplier={1.4} style={styles.previewDetail}>
              {copy.previewDetail}
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
              {copy.buy}
            </Text>
          </Pressable>
          <Text maxFontSizeMultiplier={1.4} style={styles.footnote}>
            {copy.footnote}
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
