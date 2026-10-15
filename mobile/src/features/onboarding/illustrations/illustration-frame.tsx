import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { bubbleTints } from '@/features/app-shell/theme/overview-theme';

interface IllustrationFrameProps {
  children: ReactNode;
  compact?: boolean;
}

export function IllustrationFrame({ children, compact = false }: IllustrationFrameProps) {
  const { height, fontScale } = useWindowDimensions();
  const isCompact = compact || height < 740 || fontScale > 1.3;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.illustration, isCompact && styles.compactIllustration]}
    >
      <View style={[styles.canvas, isCompact && styles.compactCanvas]}>{children}</View>
    </View>
  );
}

export function Halo({ tone = 'net' }: { tone?: 'net' | 'success' }) {
  return <View style={[styles.halo, tone === 'success' && styles.successHalo]} />;
}

const styles = StyleSheet.create({
  illustration: { height: 176, alignItems: 'center', justifyContent: 'center' },
  compactIllustration: { height: 112 },
  canvas: { width: 280, height: 176 },
  compactCanvas: { transform: [{ scale: 0.72 }] },
  halo: {
    position: 'absolute', width: 300, height: 220, left: -10, top: -22,
    experimental_backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(${bubbleTints.net.rgb}, 0.15) 0%, rgba(${bubbleTints.net.rgb}, 0) 70%)`,
  },
  successHalo: {
    experimental_backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(${bubbleTints.income.rgb}, 0.12) 0%, rgba(${bubbleTints.income.rgb}, 0) 70%)`,
  },
});
