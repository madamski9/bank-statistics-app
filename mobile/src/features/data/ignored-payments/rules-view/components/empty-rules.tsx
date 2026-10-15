import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { ignoredPaymentsCopy } from '../../ignored-payments-copy';

export function EmptyRules() {
  const copy = useCopy(ignoredPaymentsCopy);

  return (
    <Animated.View entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)} style={styles.empty}>
      <View accessibilityElementsHidden importantForAccessibility="no" style={styles.emptyIcon}>
        <SymbolView
          name={{ ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }}
          size={24}
          tintColor={overviewColors.textSecondary}
        />
      </View>
      <Text maxFontSizeMultiplier={1.4} style={styles.emptyTitle}>
        {copy.emptyTitle}
      </Text>
      <Text maxFontSizeMultiplier={1.5} style={styles.emptyBody}>
        {copy.emptyBody}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: overviewSpacing.tight,
    paddingVertical: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.block,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderRadius: 28,
    backgroundColor: overviewColors.surfacePressed,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: overviewColors.textSecondary,
  },
});
