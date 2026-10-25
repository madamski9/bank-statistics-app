import { describe, expect, test } from 'bun:test';

import {
  banksStep,
  canSkipFrom,
  flowSteps,
  focusSetupStep,
  iosUpdateStep,
  pinStep,
  plansStep,
  shortcutsIntroStep,
  skipTarget,
  stepAfter,
  stepBefore,
  stepCount,
} from './onboarding-steps';

describe('onboarding steps', () => {
  test('the full flow keeps every step and starts without the iOS update screen', () => {
    expect(flowSteps('full')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('below iOS 27 the flow starts with the update screen and leaves out the Shortcuts setup', () => {
    const steps = flowSteps('withoutCapture');

    expect(steps).toEqual([iosUpdateStep, 0, 1, plansStep, pinStep, stepCount]);
    expect(stepAfter(steps, plansStep)).toBe(pinStep);
    expect(stepBefore(steps, pinStep)).toBe(plansStep);
    expect(stepAfter(steps, iosUpdateStep)).toBe(0);
    expect(skipTarget('withoutCapture')).toBe(pinStep);
  });

  test('the preview from the developer settings shows every screen, the update screen first', () => {
    expect(flowSteps('preview')).toEqual([iosUpdateStep, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(skipTarget('preview')).toBe(shortcutsIntroStep);
  });

  test('the Shortcuts setup replay covers only the capture steps', () => {
    const steps = flowSteps('shortcuts');

    expect(steps[0]).toBe(banksStep);
    expect(steps.at(-1)).toBe(focusSetupStep);
  });

  test('the update screen cannot be skipped', () => {
    expect(canSkipFrom(iosUpdateStep)).toBe(false);
    expect(canSkipFrom(0)).toBe(true);
    expect(canSkipFrom(shortcutsIntroStep)).toBe(false);
  });
});
