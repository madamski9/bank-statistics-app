import { describe, expect, test } from 'bun:test';

import { premiumStanding } from './premium-standing';
import { premiumStatusFrom } from './premium-status';

describe('premiumStatusFrom', () => {
  test('reads a profile from a backend that does not report store subscriptions yet', () => {
    const status = premiumStatusFrom({ isPremium: true, premiumSince: 1_700_000_000_000, premiumUntil: null });

    expect(status.subscription).toBeNull();
    expect(premiumStanding(status)).toEqual({ kind: 'since', date: 1_700_000_000_000 });
  });

  test('keeps a reported store subscription', () => {
    const subscription = {
      accessUntil: 1_800_000_000_000,
      willRenew: true,
      isTrial: false,
      hasBillingIssue: false,
      managementUrl: null,
    };

    expect(premiumStatusFrom({ isPremium: true, subscription }).subscription).toEqual(subscription);
  });
});
