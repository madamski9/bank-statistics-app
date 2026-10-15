import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

export function PremiumReasonBanner({ message }: { message: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.reason}>
      <SymbolView
        accessibilityElementsHidden
        importantForAccessibility="no"
        name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
        size={14}
        tintColor={overviewColors.textPrimary}
      />
      <Text maxFontSizeMultiplier={1.5} style={styles.reasonLabel}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
