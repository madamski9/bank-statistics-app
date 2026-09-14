import { Show } from '@clerk/expo';

import { SignInScreen } from '@/features/auth/sign-in-screen';
import { OverviewScreen } from '@/features/overview/overview-screen';

export default function Index() {
  return (
    <>
      <Show when="signed-in">
        <OverviewScreen />
      </Show>
      <Show when="signed-out">
        <SignInScreen />
      </Show>
    </>
  );
}
