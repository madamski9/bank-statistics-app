import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  cancelAnimation,
  ReduceMotion,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { onboardingMotion } from '../onboarding-motion';

export function useIllustrationPhase() {
  const phase = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const start = () => {
      phase.set(withRepeat(
        withTiming(phase.get() + Math.PI * 2, onboardingMotion.float),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ));
    };

    if (AppState.currentState === 'active') {
      start();
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        start();
      } else {
        cancelAnimation(phase);
      }
    });

    return () => {
      subscription.remove();
      cancelAnimation(phase);
    };
  }, [phase, reduceMotion]);

  return phase;
}
