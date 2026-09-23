import { Show } from '@clerk/expo';

import { SignInScreen } from '@/features/auth/sign-in-screen';
import { HomeScreen } from '@/features/home/home-screen';
import { OwnedDeviceGate } from '@/features/sync/owned-device-gate';

export default function Index() {
  return (
    <>
      <Show when="signed-in">
        <OwnedDeviceGate>
          <HomeScreen />
        </OwnedDeviceGate>
      </Show>
      <Show when="signed-out">
        <SignInScreen />
      </Show>
    </>
  );
}
