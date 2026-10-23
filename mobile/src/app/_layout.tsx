import { ClerkProvider, useAuth } from '@clerk/expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { appEnvironment } from '@/app-environment';
import { brandColors } from '@/features/app-shell/brand/brand-artwork';
import { KeychainReadyGate } from '@/features/app-shell/keychain/keychain-ready-gate';
import { tokenCache } from '@/features/auth/session/token-cache';
import { LanguageBootstrap } from '@/features/app-shell/localization/language-bootstrap';
import { convexClient } from '@/convex-client';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function hideNativeSplash() {
  void SplashScreen.hideAsync().catch(() => undefined);
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView onLayout={hideNativeSplash} style={styles.root}>
      <ClerkProvider
        tokenCache={tokenCache}
        publishableKey={appEnvironment.clerkPublishableKey}
      >
        <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
          <KeychainReadyGate>
            <LanguageBootstrap>
              <Slot />
            </LanguageBootstrap>
          </KeychainReadyGate>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
});
