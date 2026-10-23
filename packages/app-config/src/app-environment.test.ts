import { describe, expect, it } from 'bun:test';

import { resolveAppEnvironment } from './app-environment';

describe('resolveAppEnvironment', () => {
  it('rejects an environment that does not declare a delivery lane', () => {
    expect(() =>
      resolveAppEnvironment({
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_c2FtcGxl',
        EXPO_PUBLIC_CONVEX_URL: 'https://example-dev.convex.cloud',
      }),
    ).toThrow('EXPO_PUBLIC_APP_ENV must be one of development, preview, production');
  });

  it('rejects production Clerk credentials outside the production lane', () => {
    expect(() =>
      resolveAppEnvironment({
        EXPO_PUBLIC_APP_ENV: 'preview',
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_c2FtcGxl',
        EXPO_PUBLIC_CONVEX_URL: 'https://example-preview.convex.cloud',
      }),
    ).toThrow('preview lane must not use production Clerk credentials');
  });

  it('rejects non-production Clerk credentials in the production lane', () => {
    expect(() =>
      resolveAppEnvironment({
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_c2FtcGxl',
        EXPO_PUBLIC_CONVEX_URL: 'https://example-production.convex.cloud',
      }),
    ).toThrow('production lane requires production Clerk credentials');
  });

  it('rejects an environment that is missing the Convex deployment URL', () => {
    expect(() =>
      resolveAppEnvironment({
        EXPO_PUBLIC_APP_ENV: 'development',
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_c2FtcGxl',
      }),
    ).toThrow('EXPO_PUBLIC_CONVEX_URL is required in the development lane');
  });

  it('rejects an environment that is missing the Clerk publishable key', () => {
    expect(() =>
      resolveAppEnvironment({
        EXPO_PUBLIC_APP_ENV: 'development',
        EXPO_PUBLIC_CONVEX_URL: 'https://example-dev.convex.cloud',
      }),
    ).toThrow('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required in the development lane');
  });

  it('resolves a development lane with its own credentials', () => {
    expect(
      resolveAppEnvironment({
        EXPO_PUBLIC_APP_ENV: 'development',
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_c2FtcGxl',
        EXPO_PUBLIC_CONVEX_URL: 'https://example-dev.convex.cloud',
      }),
    ).toEqual({
      lane: 'development',
      clerkPublishableKey: 'pk_test_c2FtcGxl',
      convexUrl: 'https://example-dev.convex.cloud',
      revenueCatApiKeys: { ios: null, android: null },
    });
  });

  it('reads the RevenueCat key of each store', () => {
    expect(
      resolveAppEnvironment({
        EXPO_PUBLIC_APP_ENV: 'preview',
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_c2FtcGxl',
        EXPO_PUBLIC_CONVEX_URL: 'https://example-preview.convex.cloud',
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_sample',
        EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_sample',
      }).revenueCatApiKeys,
    ).toEqual({ ios: 'appl_sample', android: 'goog_sample' });
  });

  it('rejects the RevenueCat Test Store in the production lane', () => {
    expect(() =>
      resolveAppEnvironment({
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_c2FtcGxl',
        EXPO_PUBLIC_CONVEX_URL: 'https://example-production.convex.cloud',
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'test_sample',
      }),
    ).toThrow('production lane must not use the RevenueCat Test Store');
  });
});
