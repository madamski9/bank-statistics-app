import { ClerkProvider, useAuth } from '@clerk/expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { Slot } from 'expo-router';

import { tokenCache } from '@/features/auth/token-cache';
import { convexClient } from '@/convex-client';

export default function RootLayout() {
  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <Slot />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
