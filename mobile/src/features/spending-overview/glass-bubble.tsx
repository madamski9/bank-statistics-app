import { memo, useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { impactLight } from '@/haptics';

import { BubbleSkin } from './bubble-skin';
import { bubbleTints, overviewColors, overviewMotion, type BubbleKey } from './overview-theme';

const EASE_IN_OUT = Easing.inOut(Easing.sin);

export interface BubbleOrigin {
  x: number;
  y: number;
  size: number;
  scaleX: number;
  scaleY: number;
}

interface GlassBubbleProps {
  tint: BubbleKey;
  size: number;
  label: string;
  value: string;
  caption?: string;
  accessibilityLabel: string;
  driftSeed: number;
  onSelect: (key: BubbleKey, origin: BubbleOrigin) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function GlassBubbleComponent({
  tint,
  size,
  label,
  value,
  caption,
  accessibilityLabel,
  driftSeed,
  onSelect,
}: GlassBubbleProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<View>(null);
  const scale = useSharedValue(1);
  const squash = useSharedValue(0);
  const illumination = useSharedValue(0);
  const driftX = useSharedValue(0);
  const driftY = useSharedValue(0);

  const amplitude = size * 0.035;

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    driftY.set(
      withRepeat(
        withTiming(amplitude, { duration: 3600 + driftSeed * 620, easing: EASE_IN_OUT }),
        -1,
        true,
      ),
    );
    driftX.set(
      withDelay(
        driftSeed * 480,
        withRepeat(
          withTiming(amplitude * 0.6, { duration: 5200 + driftSeed * 540, easing: EASE_IN_OUT }),
          -1,
          true,
        ),
      ),
    );
    return () => {
      cancelAnimation(driftX);
      cancelAnimation(driftY);
    };
  }, [amplitude, driftSeed, driftX, driftY, reducedMotion]);

  const pushIn = useCallback(() => {
    illumination.set(withTiming(1, { duration: 90, reduceMotion: ReduceMotion.System }));
    if (reducedMotion) {
      return;
    }
    scale.set(withSpring(0.92, { ...overviewMotion.pushIn, reduceMotion: ReduceMotion.System }));
    squash.set(withSpring(1, { ...overviewMotion.pushIn, reduceMotion: ReduceMotion.System }));
  }, [illumination, reducedMotion, scale, squash]);

  const release = useCallback(() => {
    illumination.set(withTiming(0, { duration: 260, reduceMotion: ReduceMotion.System }));
    scale.set(withSpring(1, { ...overviewMotion.rebound, reduceMotion: ReduceMotion.System }));
    squash.set(withSpring(0, { ...overviewMotion.rebound, reduceMotion: ReduceMotion.System }));
  }, [illumination, scale, squash]);

  const handlePress = useCallback(() => {
    impactLight();
    containerRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      if (measuredWidth <= 0 || measuredHeight <= 0) {
        return;
      }
      const currentScale = scale.get();
      const currentSquash = squash.get();
      onSelect(tint, {
        x: x + measuredWidth / 2 + driftX.get(),
        y: y + measuredHeight / 2 + driftY.get(),
        size,
        scaleX: currentScale * (1 + currentSquash * 0.065),
        scaleY: currentScale * (1 - currentSquash * 0.065),
      });
    });
  }, [driftX, driftY, onSelect, scale, size, squash, tint]);

  const bubbleStyle = useAnimatedStyle(() => {
    const currentScale = scale.get();
    const currentSquash = squash.get();

    return {
      transform: [
        { translateX: driftX.get() },
        { translateY: driftY.get() },
        { scaleX: currentScale * (1 + currentSquash * 0.065) },
        { scaleY: currentScale * (1 - currentSquash * 0.065) },
      ],
    };
  });

  const illuminationStyle = useAnimatedStyle(() => ({
    opacity: illumination.get() * 0.75,
  }));

  const valueFontSize = clamp(size * 0.145, 13, 34);
  const labelFontSize = clamp(size * 0.056, 10, 13);

  return (
    <Pressable
      accessibilityHint="Otwiera szczegóły"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={handlePress}
      onPressIn={pushIn}
      onPressOut={release}
      pressRetentionOffset={16}
      ref={containerRef}
      style={({ pressed }) => [
        { width: size, height: size },
        pressed && reducedMotion ? styles.pressed : null,
      ]}
    >
      <Animated.View style={[styles.bubble, bubbleStyle]}>
        <View
          style={[
            styles.glow,
            {
              borderRadius: size / 2,
              backgroundColor: `rgba(${bubbleTints[tint].rgb}, 0.035)`,
            },
            Platform.OS === 'ios'
              ? {
                  shadowColor: bubbleTints[tint].film,
                  shadowOpacity: 0.4,
                  shadowRadius: size * 0.18,
                  shadowOffset: { width: 0, height: 0 },
                }
              : null,
          ]}
        />
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
        <View style={[styles.content, { paddingHorizontal: size * 0.14 }]}>
          <Text
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            style={[styles.label, { fontSize: labelFontSize }]}
          >
            {label}
          </Text>
          <Text
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.2}
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[styles.value, { fontSize: valueFontSize }]}
          >
            {value}
          </Text>
          {caption !== undefined ? (
            <Text
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
              style={[styles.caption, { fontSize: labelFontSize * 0.92 }]}
            >
              {caption}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pressed: {
    opacity: 0.82,
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
    color: overviewColors.textSecondary,
  },
  value: {
    fontWeight: '700',
    letterSpacing: -0.6,
    color: overviewColors.textPrimary,
  },
  caption: {
    fontWeight: '500',
    color: overviewColors.textSecondary,
  },
});

export const GlassBubble = memo(GlassBubbleComponent);
