import { SignedIn, SignedOut } from '@clerk/clerk-expo';

import { SignInScreen } from '@/features/auth/sign-in-screen';
import { OverviewScreen } from '@/features/overview/overview-screen';

export default function Index() {
  return (
    <>
      <SignedIn>
        <OverviewScreen />
      </SignedIn>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
    </>
  );
}
