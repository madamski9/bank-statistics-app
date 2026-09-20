import { memo, useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { impactLight } from '@/haptics';

import { BubbleSkin } from './bubble-skin';
import { bubbleTints, overviewColors, overviewMotion, type BubbleKey } from './overview-theme';

const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

/** Where a bubble sits on screen, handed to the detail so it can expand from exactly there. */
export interface BubbleOrigin {
  x: number;
  y: number;
  size: number;
}

interface GlassBubbleProps {
  tint: BubbleKey;
  size: number;
  label: string;
  value: string;
  caption?: string;
  accessibilityLabel: string;
  /** Staggers the idle drift so the three bubbles never breathe in unison. */
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
  const origin = useRef<BubbleOrigin>({ x: 0, y: 0, size });
  const scale = useSharedValue(1);
  const squash = useSharedValue(0);
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
  }, [amplitude, driftSeed, driftX, driftY, reducedMotion]);

  const pushIn = useCallback(() => {
    scale.set(withSpring(0.93, { ...overviewMotion.pushIn, reduceMotion: ReduceMotion.System }));
    squash.set(withSpring(1, { ...overviewMotion.pushIn, reduceMotion: ReduceMotion.System }));
    /**
     * Measured on press-in, not on the tap: measureInWindow is a round trip to native, and on
     * the tap it sits in front of the transition. By lift-off the answer is already here.
     */
    containerRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      origin.current = { x: x + measuredWidth / 2, y: y + measuredHeight / 2, size };
    });
  }, [origin, scale, size, squash]);

  /** Release: overshoot, then a long loose wobble — a film rebounding, not a button. */
  const release = useCallback(
    (committed: boolean) => {
      scale.set(
        withSequence(
          withSpring(committed ? 1.11 : 1.04, {
            ...overviewMotion.rebound,
            reduceMotion: ReduceMotion.System,
          }),
          withSpring(1, { ...overviewMotion.settle, reduceMotion: ReduceMotion.System }),
        ),
      );
      squash.set(
        withSequence(
          withSpring(committed ? -0.9 : -0.4, {
            ...overviewMotion.rebound,
            reduceMotion: ReduceMotion.System,
          }),
          withSpring(0, { ...overviewMotion.settle, reduceMotion: ReduceMotion.System }),
        ),
      );
    },
    [scale, squash],
  );

  const handlePress = useCallback(() => {
    release(true);
    impactLight();
    onSelect(tint, origin.current);
  }, [onSelect, origin, release, tint]);

  const bubbleStyle = useAnimatedStyle(() => {
    const currentScale = scale.get();
    const currentSquash = squash.get();

    return {
      transform: [
        { translateX: driftX.get() },
        { translateY: driftY.get() },
        { scaleX: currentScale * (1 + currentSquash * 0.07) },
        { scaleY: currentScale * (1 - currentSquash * 0.07) },
      ],
    };
  });

  const valueFontSize = clamp(size * 0.145, 13, 34);
  const labelFontSize = clamp(size * 0.056, 10, 13);

  return (
    <Pressable
      accessibilityHint="Otwiera szczegóły"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={handlePress}
      onPressIn={pushIn}
      onPressOut={() => release(false)}
      pressRetentionOffset={16}
      ref={containerRef}
      style={({ pressed }) => [
        { width: size, height: size },
        pressed ? styles.pressed : null,
      ]}
    >
      <Animated.View style={[styles.bubble, bubbleStyle]}>
        {/* iOS only paints a shadow for a layer that has a background, hence the tinted disc. */}
        <View
          shouldRasterizeIOS
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
  /** Reduced-motion users get this instead of the rebound. */
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

/**
 * Memoised: selecting a bubble or crossing a page boundary re-renders the shell, and nothing
 * about that should rebuild three bubbles' worth of gradient layers mid-transition.
 */
export const GlassBubble = memo(GlassBubbleComponent);
