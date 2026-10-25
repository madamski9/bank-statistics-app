import type { OnboardingReplay } from './onboarding-replay';
import type { OnboardingFlow } from './onboarding-steps';

export function onboardingFlow(replay: OnboardingReplay, needsIosUpdate: boolean): OnboardingFlow {
  if (replay === 'shortcuts') {
    return 'shortcuts';
  }

  if (replay === 'full') {
    return 'preview';
  }

  return needsIosUpdate ? 'withoutCapture' : 'full';
}
