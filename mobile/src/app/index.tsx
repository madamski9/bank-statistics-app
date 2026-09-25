import { Show } from '@clerk/expo';

import { AccountStandingGate } from '@/features/account-data/account-standing-gate';
import { SignInScreen } from '@/features/auth/sign-in-screen';
import { LocalizedHomeScreen } from '@/features/home/localized-home-screen';
import { OnboardingGate } from '@/features/onboarding/onboarding-gate';
import { AppLockGate } from '@/features/privacy/app-lock-gate';
import { PrivacyProvider } from '@/features/privacy/privacy-provider';
import { OwnedDeviceGate } from '@/features/sync/owned-device-gate';
import { SignedOutSpendingWidget } from '@/features/widgets/use-spending-widget';

export default function Index() {
  return (
    <>
      <Show when="signed-in">
        <OwnedDeviceGate>
          <AccountStandingGate>
            <PrivacyProvider>
              <OnboardingGate>
                <AppLockGate>
                  <LocalizedHomeScreen />
                </AppLockGate>
              </OnboardingGate>
            </PrivacyProvider>
          </AccountStandingGate>
        </OwnedDeviceGate>
      </Show>
      <Show when="signed-out">
        <SignInScreen />
        <SignedOutSpendingWidget />
      </Show>
    </>
  );
}
