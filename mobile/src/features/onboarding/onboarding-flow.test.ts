import { describe, expect, test } from 'bun:test';

import { onboardingFlow } from './onboarding-flow';

describe('onboardingFlow', () => {
  test('a first onboarding below iOS 27 leaves out the Shortcuts setup', () => {
    expect(onboardingFlow('none', true)).toBe('withoutCapture');
    expect(onboardingFlow('none', false)).toBe('full');
  });

  test('the onboarding preview from the developer settings shows every screen on any iOS version', () => {
    expect(onboardingFlow('full', true)).toBe('preview');
    expect(onboardingFlow('full', false)).toBe('preview');
  });

  test('the Shortcuts setup replay stays a Shortcuts setup', () => {
    expect(onboardingFlow('shortcuts', false)).toBe('shortcuts');
  });
});
