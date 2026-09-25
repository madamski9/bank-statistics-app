import type { ExpoConfig } from 'expo/config';

interface LaneIdentity {
  bundleIdentifier: string;
  scheme: string;
  displayName: string;
}

const laneIdentities: Record<string, LaneIdentity> = {
  development: {
    bundleIdentifier: 'com.bankstats.app.dev',
    scheme: 'bankstats-dev',
    displayName: 'BankStats Dev',
  },
  preview: {
    bundleIdentifier: 'com.bankstats.app.preview',
    scheme: 'bankstats-preview',
    displayName: 'BankStats Preview',
  },
  production: {
    bundleIdentifier: 'com.bankstats.app',
    scheme: 'bankstats',
    displayName: 'BankStats',
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

const config: ExpoConfig = {
  name: 'BankStats',
  slug: 'bank-statistics-app',
  version: '1.0.0',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/c5ceea5a-b064-465d-a7a7-8d01043d28c7',
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
    },
  },
  android: {
    package: identity.bundleIdentifier,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
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
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
    [
      'expo-local-authentication',
      { faceIDPermission: 'BankStats używa Face ID, żeby odblokować aplikację i odsłonić widżet.' },
    ],
    'expo-notifications',
    ['@clerk/expo', { appleSignIn: false }],
    '@bankstats/ingestion-native',
    [
      'expo-widgets',
      {
        bundleIdentifier: `${identity.bundleIdentifier}.widgets`,
        groupIdentifier: `group.${identity.bundleIdentifier}.ingestion`,
        widgets: [
          {
            name: 'SpendingWidget',
            displayName: 'Wydatki',
            description: 'Wydatki w tym miesiącu, limity bliskie końca i sklepy, w których wydajesz najwięcej.',
            ios: {
              supportedFamilies: [
                'systemSmall',
                'systemMedium',
                'accessoryRectangular',
                'accessoryInline',
              ],
              configuration: {
                title: 'Wydatki',
                description: 'Wybierz ekran, od którego zaczyna widżet.',
                parameters: {
                  startScreen: {
                    title: 'Ekran startowy',
                    type: 'enum',
                    default: 'month',
                    values: [
                      { name: 'Ten miesiąc', value: 'month' },
                      { name: 'Uważaj na limit', value: 'watch' },
                      { name: 'Limity', value: 'limits' },
                      { name: 'Sklepy', value: 'shops' },
                    ],
                  },
                },
              },
            },
          },
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
