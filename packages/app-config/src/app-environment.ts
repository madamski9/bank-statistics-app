const deliveryLanes = ['development', 'preview', 'production'] as const;

const clerkProductionKeyPrefix = 'pk_live_';
const revenueCatTestStoreKeyPrefix = 'test_';

export type DeliveryLane = (typeof deliveryLanes)[number];

export interface RevenueCatApiKeys {
  ios: string | null;
  android: string | null;
}

export interface AppEnvironment {
  lane: DeliveryLane;
  clerkPublishableKey: string;
  convexUrl: string;
  revenueCatApiKeys: RevenueCatApiKeys;
}

function requireVariable(
  env: Record<string, string | undefined>,
  name: string,
  lane: DeliveryLane,
): string {
  const value = env[name];

  if (value === undefined || value === '') {
    throw new Error(`${name} is required in the ${lane} lane`);
  }

  return value;
}

function optionalVariable(env: Record<string, string | undefined>, name: string): string | null {
  const value = env[name];

  return value === undefined || value === '' ? null : value;
}

function resolveRevenueCatApiKeys(env: Record<string, string | undefined>, lane: DeliveryLane): RevenueCatApiKeys {
  const keys = {
    ios: optionalVariable(env, 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY'),
    android: optionalVariable(env, 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY'),
  };

  if (lane === 'production' && Object.values(keys).some((key) => key?.startsWith(revenueCatTestStoreKeyPrefix))) {
    throw new Error('production lane must not use the RevenueCat Test Store');
  }

  return keys;
}

function isDeliveryLane(value: string | undefined): value is DeliveryLane {
  return deliveryLanes.includes(value as DeliveryLane);
}

export function resolveAppEnvironment(env: Record<string, string | undefined>): AppEnvironment {
  const lane = env.EXPO_PUBLIC_APP_ENV;

  if (!isDeliveryLane(lane)) {
    throw new Error(`EXPO_PUBLIC_APP_ENV must be one of ${deliveryLanes.join(', ')}`);
  }

  const clerkPublishableKey = requireVariable(env, 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY', lane);

  const usesProductionClerkKey = clerkPublishableKey.startsWith(clerkProductionKeyPrefix);

  if (lane !== 'production' && usesProductionClerkKey) {
    throw new Error(`${lane} lane must not use production Clerk credentials`);
  }

  if (lane === 'production' && !usesProductionClerkKey) {
    throw new Error('production lane requires production Clerk credentials');
  }

  const convexUrl = requireVariable(env, 'EXPO_PUBLIC_CONVEX_URL', lane);

  const revenueCatApiKeys = resolveRevenueCatApiKeys(env, lane);

  return { lane, clerkPublishableKey, convexUrl, revenueCatApiKeys };
}
