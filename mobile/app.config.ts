import type { ExpoConfig } from 'expo/config';

interface LaneIdentity {
  bundleIdentifier: string;
  scheme: string;
  displayName: string;
  signsUpdates: boolean;
}

const laneIdentities: Record<string, LaneIdentity> = {
  development: {
    bundleIdentifier: 'com.bankstats.app.dev',
    scheme: 'bankstats-dev',
    displayName: 'BankStats Dev',
    signsUpdates: false,
  },
  preview: {
    bundleIdentifier: 'com.bankstats.app.preview',
    scheme: 'bankstats-preview',
    displayName: 'Bank Stats',
    signsUpdates: true,
  },
  production: {
    bundleIdentifier: 'com.bankstats.app',
    scheme: 'bankstats',
    displayName: 'Bank Stats',
    signsUpdates: true,
  },
};

function resolveLaneIdentity(): LaneIdentity {
  const lane = process.env.EXPO_PUBLIC_APP_ENV;
  const identity = lane === undefined ? undefined : laneIdentities[lane];

  if (identity === undefined) {
    throw new Error(
      `EXPO_PUBLIC_APP_ENV must be one of ${Object.keys(laneIdentities).join(', ')}. ` +
        'Set it in mobile/.env.local for local work, or in the build environment.',
    );
  }

  return identity;
}

const identity = resolveLaneIdentity();

const signedUpdates = {
  codeSigningCertificate: './certs/certificate.pem',
  codeSigningMetadata: {
    keyid: 'main',
    alg: 'rsa-v1_5-sha256' as const,
  },
};

const config: ExpoConfig = {
  name: 'BankStats',
  slug: 'bank-statistics-app',
  version: '1.0.4',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/c5ceea5a-b064-465d-a7a7-8d01043d28c7',
    ...(identity.signsUpdates ? signedUpdates : {}),
  },
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: identity.scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: identity.bundleIdentifier,
    deploymentTarget: '17.0',
    infoPlist: {
      CFBundleDisplayName: identity.displayName,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: identity.bundleIdentifier,
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: './assets/images/splash-icon.png',
        imageWidth: 112,
        resizeMode: 'contain',
        ios: {
          image: './assets/images/splash-lockup.png',
          imageWidth: 240,
        },
      },
    ],
    'expo-secure-store',
    [
      'expo-local-authentication',
      { faceIDPermission: 'BankStats używa Face ID, żeby odblokować aplikację i odsłonić widżet.' },
    ],
    './plugins/withoutPushEntitlement.js',
    'expo-notifications',
    ['@clerk/expo', { appleSignIn: false }],
    '@bankstats/ingestion-native',
    './plugins/withSpendingWidget.js',
    [
      'expo-widgets',
      {
        bundleIdentifier: `${identity.bundleIdentifier}.widgets`,
        groupIdentifier: `group.${identity.bundleIdentifier}.ingestion`,
        widgets: [
          {
            name: 'SpendingWidget',
            displayName: 'Wydatki',
            description: 'Wydatki z ostatnich 30 dni, limity bliskie końca i sklepy, w których wydajesz najwięcej.',
            ios: {
              supportedFamilies: [
                'systemSmall',
                'systemMedium',
                'accessoryRectangular',
                'accessoryInline',
              ],
              configuration: {
                title: 'Wydatki',
                description: 'Wybierz widok. Dodaj kolejne widżety do stosu, żeby przewijać je pionowo.',
                parameters: {
                  startScreen: {
                    title: 'Widok',
                    type: 'enum',
                    default: 'month',
                    values: [
                      { name: 'Ostatnie 30 dni', value: 'month' },
                      { name: 'Uważaj na limit', value: 'watch' },
                      { name: 'Limity', value: 'limits' },
                      { name: 'Sklepy', value: 'shops' },
                    ],
                  },
                },
              },
            },
          },
          ...[
            { name: 'SpendingWatchWidget', displayName: 'Najbliżej limitu', description: 'Sprawdź, ile możesz jeszcze wydać. Dodaj do stosu z pozostałymi widżetami BankStats.' },
            { name: 'SpendingLimitsWidget', displayName: 'Limity', description: 'Twoje limity wydatków w jednym miejscu. Dodaj do stosu BankStats i przewijaj pionowo.' },
            { name: 'SpendingShopsWidget', displayName: 'Sklepy', description: 'Sklepy, w których wydajesz najwięcej. Dodaj do stosu BankStats i przewijaj pionowo.' },
          ].map((widget) => ({
            ...widget,
            ios: { supportedFamilies: ['systemSmall', 'systemMedium'] },
          })),
        ],
      },
    ],
    './plugins/withUISceneLifecycle.js',
    './plugins/withDisableUserScriptSandboxing.js',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: 'c5ceea5a-b064-465d-a7a7-8d01043d28c7',
    },
  },
};

export default config;
