import { SymbolView } from 'expo-symbols';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { PremiumBenefits } from './components/premium-benefits';
import { PremiumCodeForm } from './components/premium-code-form';
import { PremiumHero } from './components/premium-hero';
import { PremiumPreviewToggle } from './components/premium-preview-toggle';
import { PremiumReasonBanner } from './components/premium-reason-banner';
import { PurchaseFooter } from './components/purchase-footer';
import type { PremiumReason } from './premium-access';
import { premiumCopy } from './premium-copy';
import { usePreviewWithoutPremium } from './premium-preview';
import type { PremiumStatus } from './use-premium';

interface PremiumScreenProps {
  status: PremiumStatus | undefined;
  reason: PremiumReason | null;
  onClose: () => void;
}

export function PremiumScreen({ status, reason, onClose }: PremiumScreenProps) {
  const copy = useCopy(premiumCopy);
  const isPremium = status?.isPremium === true;
  const isPreviewingWithoutPremium = usePreviewWithoutPremium();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : undefined} style={[styles.screen, styles.sheetTop]}>
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
        {reason !== null && !isPremium ? <PremiumReasonBanner message={copy.reasons[reason]} /> : null}
        <PremiumHero status={status} />
        <PremiumBenefits isPremium={isPremium} />
        {isPremium ? null : <PremiumCodeForm />}
        {__DEV__ && (isPremium || isPreviewingWithoutPremium) ? (
          <PremiumPreviewToggle isPreviewing={isPreviewingWithoutPremium} />
        ) : null}
      </ScrollView>

      {isPremium ? null : <PurchaseFooter />}
    </KeyboardAvoidingView>
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
});
