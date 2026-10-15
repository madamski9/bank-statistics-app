import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import type { BubbleKey, BubbleTint } from '@/features/app-shell/theme/overview-theme';

import { spendingOverviewCopy } from '../spending-overview-copy';
import { BubbleSkin } from './bubble-skin';
import { BubbleGlow } from './components/bubble-glow';
import { BubbleLabel } from './components/bubble-label';
import { useBubbleMotion, type BubbleOrigin } from './use-bubble-motion';

export type { BubbleOrigin } from './use-bubble-motion';

interface GlassBubbleProps {
  bubbleKey: BubbleKey;
  tint: BubbleTint;
  size: number;
  label: string;
  value: string;
  caption?: string;
  accessibilityLabel: string;
  driftSeed: number;
  onSelect: (key: BubbleKey, origin: BubbleOrigin) => void;
}

function GlassBubbleComponent({
  bubbleKey,
  tint,
  size,
  label,
  value,
  caption,
  accessibilityLabel,
  driftSeed,
  onSelect,
}: GlassBubbleProps) {
  const copy = useCopy(spendingOverviewCopy);
  const { containerRef, isPressed, tap, handlePress, measureRestingCenter, bubbleStyle, illuminationStyle } =
    useBubbleMotion({ bubbleKey, size, driftSeed, onSelect });

  return (
    <GestureDetector gesture={tap}>
      <View
        accessible
        accessibilityHint={copy.openDetailsHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onAccessibilityTap={handlePress}
        onLayout={measureRestingCenter}
        ref={containerRef}
        style={[{ width: size, height: size }, isPressed ? styles.pressed : null]}
      >
        <Animated.View pointerEvents="none" style={[styles.bubble, bubbleStyle]}>
          <BubbleGlow size={size} tint={tint} />
          <BubbleSkin size={size} tint={tint} />
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: size / 2,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.55)',
                experimental_backgroundImage:
                  'radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.08) 42%, rgba(255, 255, 255, 0) 72%)',
              },
              illuminationStyle,
            ]}
          />
          <BubbleLabel caption={caption} label={label} size={size} value={value} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flex: 1,
  },
  pressed: {
    opacity: 0.82,
  },
});

export const GlassBubble = memo(GlassBubbleComponent);
