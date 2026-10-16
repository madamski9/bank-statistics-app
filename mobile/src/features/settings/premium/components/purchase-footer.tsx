import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { premiumCopy } from '../premium-copy';

export function PurchaseFooter() {
  const copy = useCopy(premiumCopy);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + overviewSpacing.block }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => Alert.alert('BankStats Premium', copy.purchaseSoon)}
        style={({ pressed }) => [styles.purchase, pressed ? styles.pressed : null]}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.purchaseLabel}>
          {copy.buy}
        </Text>
      </Pressable>
      <Text maxFontSizeMultiplier={1.4} style={styles.footnote}>
        {Platform.OS === 'android' ? copy.footnoteAndroid : copy.footnote}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  pressed: {
    opacity: 0.7,
  },
});
