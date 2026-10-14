import { Show, useAuth } from '@clerk/expo';

import { LoadingScreen } from '@/features/brand/loading-screen';

import { AccountStandingGate } from '@/features/account-data/account-standing-gate';
import { SignInScreen } from '@/features/auth/sign-in-screen';
import { LocalizedHomeScreen } from '@/features/home/localized-home-screen';
import { OnboardingGate } from '@/features/onboarding/onboarding-gate';
import { AppLockGate, AppLockScreen } from '@/features/privacy/app-lock-gate';
import { PrivacyProvider } from '@/features/privacy/privacy-provider';
import { PrivacyBoundary } from '@/features/privacy/privacy-shield';
import { CloudSyncChoiceGate } from '@/features/sync/cloud-sync-choice-gate';
import { OwnedDeviceGate } from '@/features/sync/owned-device-gate';
import { SignedOutSpendingWidget } from '@/features/widgets/use-spending-widget';

export default function Index() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Show when="signed-in">
        <OwnedDeviceGate>
          <AccountStandingGate>
            <PrivacyProvider lockScreen={<AppLockScreen />}>
              <PrivacyBoundary>
                <OnboardingGate>
                  <CloudSyncChoiceGate>
                    <AppLockGate>
                      <LocalizedHomeScreen />
                    </AppLockGate>
                  </CloudSyncChoiceGate>
                </OnboardingGate>
              </PrivacyBoundary>
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
