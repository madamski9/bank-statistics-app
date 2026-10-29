import { describe, expect, test } from 'bun:test';

import { premiumStanding } from './premium-standing';
import type { PremiumStatus, StoreSubscriptionStatus } from './use-premium';

const free: PremiumStatus = { isPremium: false, premiumSince: null, premiumUntil: null, subscription: null };
const renewal = Date.UTC(2026, 10, 23);

function subscribed(subscription: Partial<StoreSubscriptionStatus>): PremiumStatus {
  return {
    isPremium: true,
    premiumSince: null,
    premiumUntil: null,
    subscription: {
      accessUntil: renewal,
      willRenew: true,
      isTrial: false,
      hasBillingIssue: false,
      managementUrl: null,
      ...subscription,
    },
  };
}

describe('premium standing', () => {
  test('describes the free product', () => {
    expect(premiumStanding(free)).toEqual({ kind: 'free' });
  });

  test('shows when a store subscription renews or ends', () => {
    expect(premiumStanding(subscribed({}))).toEqual({ kind: 'renews', date: renewal });
    expect(premiumStanding(subscribed({ willRenew: false }))).toEqual({ kind: 'ends', date: renewal });
  });

  test('shows when a free trial ends, unless it was cancelled', () => {
    expect(premiumStanding(subscribed({ isTrial: true }))).toEqual({ kind: 'trial', date: renewal });
    expect(premiumStanding(subscribed({ isTrial: true, willRenew: false }))).toEqual({ kind: 'ends', date: renewal });
  });

  test('puts a billing problem ahead of everything else', () => {
    expect(premiumStanding(subscribed({ isTrial: true, hasBillingIssue: true }))).toEqual({
      kind: 'billingIssue',
      date: renewal,
    });
  });

  test('describes a gift by its end date or start date', () => {
    expect(premiumStanding({ ...free, isPremium: true, premiumUntil: renewal })).toEqual({ kind: 'until', date: renewal });
    expect(premiumStanding({ ...free, isPremium: true, premiumSince: renewal })).toEqual({ kind: 'since', date: renewal });
    expect(premiumStanding({ ...free, isPremium: true })).toEqual({ kind: 'thanks' });
  });

  test('thanks a subscriber whose access does not expire', () => {
    expect(premiumStanding(subscribed({ accessUntil: null }))).toEqual({ kind: 'thanks' });
  });
});
