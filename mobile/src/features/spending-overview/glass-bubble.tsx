import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

import { useCopy } from '@/features/localization/language';
import { impactLight } from '@/haptics';

import { BubbleSkin } from './bubble-skin';
import { createBubbleTap } from './bubble-tap';
import { bubbleTints, overviewColors, overviewMotion, type BubbleKey } from './overview-theme';
import { spendingOverviewCopy } from './spending-overview-copy';

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
  const copy = useCopy(spendingOverviewCopy);
  const reducedMotion = useReducedMotion();
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<View>(null);
  const restingCenter = useSharedValue({ x: 0, y: 0 });
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

  const measureRestingCenter = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      if (measuredWidth <= 0 || measuredHeight <= 0) {
        return;
      }

      restingCenter.set({ x: x + measuredWidth / 2, y: y + measuredHeight / 2 });
    });
  }, [restingCenter]);

  const pushIn = useCallback(() => {
    illumination.set(withTiming(1, { duration: 90, reduceMotion: ReduceMotion.System }));

    if (reducedMotion) {
      setIsPressed(true);
      return;
    }
    scale.set(withSpring(0.92, { ...overviewMotion.pushIn, reduceMotion: ReduceMotion.System }));
    squash.set(withSpring(1, { ...overviewMotion.pushIn, reduceMotion: ReduceMotion.System }));
  }, [illumination, reducedMotion, scale, squash]);

  const release = useCallback(() => {
    if (reducedMotion) {
      setIsPressed(false);
    }

    illumination.set(withTiming(0, { duration: 260, reduceMotion: ReduceMotion.System }));
    scale.set(withSpring(1, { ...overviewMotion.rebound, reduceMotion: ReduceMotion.System }));
    squash.set(withSpring(0, { ...overviewMotion.rebound, reduceMotion: ReduceMotion.System }));
  }, [illumination, reducedMotion, scale, squash]);

  const handlePress = useCallback(() => {
    const center = restingCenter.get();
    const currentScale = scale.get();
    const currentSquash = squash.get();

    impactLight();
    onSelect(tint, {
      x: center.x + driftX.get(),
      y: center.y + driftY.get(),
      size,
      scaleX: currentScale * (1 + currentSquash * 0.065),
      scaleY: currentScale * (1 - currentSquash * 0.065),
    });
    release();
  }, [driftX, driftY, onSelect, release, restingCenter, scale, size, squash, tint]);

  const tap = useMemo(() => {
    const bubbleTap = createBubbleTap(handlePress, release);

    return Gesture.Tap()
      .runOnJS(true)
      .maxDuration(1200)
      .maxDistance(32)
      .shouldCancelWhenOutside(false)
      .onTouchesDown((event) => {
        bubbleTap.down(event.allTouches[0]);
        pushIn();
      })
      .onTouchesMove((event) => {
        bubbleTap.move(event.allTouches[0]);
      })
      .onTouchesUp((event) => {
        bubbleTap.up(event.allTouches[0]);
      })
      .onTouchesCancelled((event) => {
        bubbleTap.cancel(event.allTouches[0]);
      })
      .onFinalize((_event, success) => {
        bubbleTap.finalize(success);
      });
  }, [handlePress, pushIn, release]);

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
      </View>
    </GestureDetector>
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
