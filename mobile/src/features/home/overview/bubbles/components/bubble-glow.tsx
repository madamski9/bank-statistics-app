import { Platform, StyleSheet, View } from 'react-native';

import type { BubbleTint } from '@/features/app-shell/theme/overview-theme';

export function BubbleGlow({ size, tint }: { size: number; tint: BubbleTint }) {
  return (
    <View
      style={[
        styles.glow,
        {
          borderRadius: size / 2,
          backgroundColor: `rgba(${tint.rgb}, 0.035)`,
        },
        Platform.OS === 'ios'
          ? {
              shadowColor: tint.film,
              shadowOpacity: 0.4,
              shadowRadius: size * 0.18,
              shadowOffset: { width: 0, height: 0 },
            }
          : null,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
