import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { screenErrorCopy } from './screen-error-copy';

export function ScreenError({ retry }: ErrorBoundaryProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(screenErrorCopy);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + overviewSpacing.block },
      ]}
    >
      <View style={styles.copy}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          {copy.title}
        </Text>
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.body}>
          {copy.body}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
      >
        <Text maxFontSizeMultiplier={1.4} style={styles.primaryLabel}>
          {copy.retry}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.gutter,
    backgroundColor: overviewColors.background,
  },
  copy: {
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: overviewColors.textSecondary,
  },
  primary: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: overviewColors.surfacePressed,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
