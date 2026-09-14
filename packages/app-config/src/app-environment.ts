const deliveryLanes = ['development', 'preview', 'production'] as const;

const clerkProductionKeyPrefix = 'pk_live_';

export type DeliveryLane = (typeof deliveryLanes)[number];

export interface AppEnvironment {
  lane: DeliveryLane;
  clerkPublishableKey: string;
  convexUrl: string;
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

  return { lane, clerkPublishableKey, convexUrl };
}
