export const iosUpdateStep = -1;
export const shortcutsIntroStep = 3;
export const plansStep = 2;
export const banksStep = 4;
export const automationStep = 5;
export const focusIntroStep = 6;
export const focusSetupStep = 7;
export const pinStep = 8;
export const stepCount = 9;

export type OnboardingFlow = 'full' | 'withoutCapture' | 'shortcuts' | 'preview';

const introSteps = [0, 1, plansStep];
const captureSteps = [shortcutsIntroStep, banksStep, automationStep, focusIntroStep, focusSetupStep];

export function flowSteps(flow: OnboardingFlow): number[] {
  if (flow === 'shortcuts') {
    return [banksStep, automationStep, focusIntroStep, focusSetupStep];
  }

  if (flow === 'withoutCapture') {
    return [iosUpdateStep, ...introSteps, pinStep, stepCount];
  }

  const fullSteps = [...introSteps, ...captureSteps, pinStep, stepCount];

  return flow === 'preview' ? [iosUpdateStep, ...fullSteps] : fullSteps;
}

export function stepAfter(steps: number[], step: number): number {
  return steps[Math.min(steps.indexOf(step) + 1, steps.length - 1)];
}

export function stepBefore(steps: number[], step: number): number {
  return steps[Math.max(steps.indexOf(step) - 1, 0)];
}

export function skipTarget(flow: OnboardingFlow): number {
  return flow === 'withoutCapture' ? pinStep : shortcutsIntroStep;
}

export function canSkipFrom(step: number): boolean {
  return step >= 0 && step < shortcutsIntroStep;
}

export function setsUpCapture(flow: OnboardingFlow): boolean {
  return flow !== 'withoutCapture';
}
