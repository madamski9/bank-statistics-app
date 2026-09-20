import { Show } from '@clerk/expo';

import { SignInScreen } from '@/features/auth/sign-in-screen';
import { HomeScreen } from '@/features/home/home-screen';

export default function Index() {
  return (
    <>
      <Show when="signed-in">
        <HomeScreen />
      </Show>
      <Show when="signed-out">
        <SignInScreen />
      </Show>
    </>
  );
}
