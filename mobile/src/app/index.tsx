import { Show, useAuth } from '@clerk/expo';

import { LoadingScreen } from '@/features/app-shell/brand/loading-screen';
import { ScreenError } from '@/features/app-shell/errors/screen-error';

import { AccountStandingGate } from '@/features/settings/account-data/account-standing/account-standing-gate';
import { SignInScreen } from '@/features/auth/sign-in/sign-in-screen';
import { LocalizedHomeScreen } from '@/features/home/localized-home-screen';
import { OnboardingGate } from '@/features/onboarding/onboarding-gate';
import { AppLockGate, AppLockScreen } from '@/features/settings/privacy/app-lock/app-lock-gate';
import { PrivacyProvider } from '@/features/settings/privacy/privacy-provider';
import { PrivacyBoundary } from '@/features/settings/privacy/privacy-shield';
import { CloudSyncChoiceGate } from '@/features/data/sync/cloud-sync/cloud-sync-choice-gate';
import { OwnedDeviceGate } from '@/features/data/sync/device-ownership/owned-device-gate';
import { SignedOutSpendingWidget } from '@/features/widgets/use-spending-widget';

export { ScreenError as ErrorBoundary };

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
