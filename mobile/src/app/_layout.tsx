import { ClerkProvider, useAuth } from '@clerk/expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { Slot } from 'expo-router';

import { appEnvironment } from '@/app-environment';
import { tokenCache } from '@/features/auth/token-cache';
import { convexClient } from '@/convex-client';

export default function RootLayout() {
  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={appEnvironment.clerkPublishableKey}
    >
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <Slot />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
