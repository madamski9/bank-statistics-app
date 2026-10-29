import { v, type Infer } from 'convex/values';

import { isSameText } from './webhookSignature';

const revenueCatApiUrl = 'https://api.revenuecat.com/v1';
const clerkUserIdPrefix = 'user_';

export const premiumEntitlementId = 'bank_stats_premium';

export const storeSubscriptionFields = v.object({
  isActive: v.boolean(),
  accessUntil: v.optional(v.number()),
  willRenew: v.boolean(),
  isTrial: v.boolean(),
  hasBillingIssue: v.boolean(),
  store: v.optional(v.string()),
  managementUrl: v.optional(v.string()),
  checkedAt: v.number(),
});

export type StoreSubscription = Infer<typeof storeSubscriptionFields>;

interface RevenueCatEntitlement {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string;
}

interface RevenueCatSubscription {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  period_type?: string;
  store?: string;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  refunded_at?: string | null;
  is_sandbox?: boolean;
}

export interface RevenueCatCustomer {
  request_date_ms?: number;
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>;
    subscriptions?: Record<string, RevenueCatSubscription>;
    management_url?: string | null;
  };
}

function timeOf(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const time = Date.parse(value);

  return Number.isNaN(time) ? undefined : time;
}

function latestOf(times: (number | undefined)[]): number | undefined {
  const known = times.filter((time): time is number => time !== undefined);

  return known.length === 0 ? undefined : Math.max(...known);
}

export function storeSubscriptionFrom(
  customer: RevenueCatCustomer,
  now: number,
  acceptsSandbox: boolean,
): StoreSubscription {
  const checkedAt = customer.request_date_ms ?? now;
  const entitlement = customer.subscriber?.entitlements?.[premiumEntitlementId];
  const inactive = { isActive: false, willRenew: false, isTrial: false, hasBillingIssue: false, checkedAt };

  if (entitlement === undefined) {
    return inactive;
  }

  const subscription =
    entitlement.product_identifier === undefined
      ? undefined
      : customer.subscriber?.subscriptions?.[entitlement.product_identifier];
  if (subscription?.is_sandbox === true && !acceptsSandbox) {
    return inactive;
  }

  const isLifetime = entitlement.expires_date === null;
  const accessUntil = isLifetime
    ? undefined
    : latestOf([
        timeOf(entitlement.expires_date),
        timeOf(entitlement.grace_period_expires_date),
        timeOf(subscription?.grace_period_expires_date),
      ]);
  const isActive = isLifetime || (accessUntil !== undefined && accessUntil > checkedAt);

  if (!isActive) {
    return inactive;
  }

  const managementUrl = customer.subscriber?.management_url ?? undefined;

  return {
    isActive,
    accessUntil,
    willRenew:
      !isLifetime &&
      subscription !== undefined &&
      subscription.unsubscribe_detected_at == null &&
      subscription.refunded_at == null,
    isTrial: subscription?.period_type === 'trial',
    hasBillingIssue: subscription?.billing_issues_detected_at != null,
    store: subscription?.store,
    managementUrl,
    checkedAt,
  };
}

export async function fetchRevenueCatCustomer(appUserId: string, secretKey: string): Promise<RevenueCatCustomer> {
  const response = await fetch(`${revenueCatApiUrl}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (!response.ok) {
    throw new Error(`RevenueCat answered the customer lookup with status ${response.status}.`);
  }

  return (await response.json()) as RevenueCatCustomer;
}

export function isAuthorizedWebhook(header: string | null, expected: string): boolean {
  return header !== null && isSameText(header, expected);
}

function textsOf(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function webhookOwnerIds(payload: unknown): string[] {
  const event =
    typeof payload === 'object' && payload !== null && 'event' in payload && typeof payload.event === 'object'
      ? (payload.event as Record<string, unknown> | null)
      : null;

  if (event === null) {
    return [];
  }

  const candidates = [event.app_user_id, event.transferred_from, event.transferred_to].flatMap(textsOf);

  return [...new Set(candidates.filter((id) => id.startsWith(clerkUserIdPrefix)))];
}
