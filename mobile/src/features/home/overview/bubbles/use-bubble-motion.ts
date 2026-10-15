import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
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

import { overviewMotion, type BubbleKey } from '@/features/app-shell/theme/overview-theme';
import { impactLight } from '@/haptics';

import { createBubbleTap } from './bubble-tap';

const EASE_IN_OUT = Easing.inOut(Easing.sin);

export interface BubbleOrigin {
  x: number;
  y: number;
  size: number;
  scaleX: number;
  scaleY: number;
}

interface BubbleMotionOptions {
  bubbleKey: BubbleKey;
  size: number;
  driftSeed: number;
  onSelect: (key: BubbleKey, origin: BubbleOrigin) => void;
}

export function useBubbleMotion({ bubbleKey, size, driftSeed, onSelect }: BubbleMotionOptions) {
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
    onSelect(bubbleKey, {
      x: center.x + driftX.get(),
      y: center.y + driftY.get(),
      size,
      scaleX: currentScale * (1 + currentSquash * 0.065),
      scaleY: currentScale * (1 - currentSquash * 0.065),
    });
    release();
  }, [bubbleKey, driftX, driftY, onSelect, release, restingCenter, scale, size, squash]);

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

  return {
    containerRef,
    isPressed,
    tap,
    handlePress,
    measureRestingCenter,
    bubbleStyle,
    illuminationStyle,
  };
}
