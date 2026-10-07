import { ClerkProvider } from '@clerk/expo';
import { ConvexProviderWithAuth } from 'convex/react';
import { Slot } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { appEnvironment } from '@/app-environment';
import { useConvexAuthFromClerk } from '@/features/auth/convex-auth';
import { tokenCache } from '@/features/auth/token-cache';
import { LanguageBootstrap } from '@/features/localization/language-bootstrap';
import { convexClient } from '@/convex-client';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ClerkProvider
        tokenCache={tokenCache}
        publishableKey={appEnvironment.clerkPublishableKey}
      >
        <ConvexProviderWithAuth client={convexClient} useAuth={useConvexAuthFromClerk}>
          <LanguageBootstrap>
            <Slot />
          </LanguageBootstrap>
        </ConvexProviderWithAuth>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
