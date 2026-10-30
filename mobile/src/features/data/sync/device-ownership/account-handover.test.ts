import { describe, expect, test } from 'bun:test';

import { isOwnedAfterHandover, type AccountHandover } from './account-handover';

function phone(owner: string | null, previousOwner: string | null) {
  const state = { owner, onboardingCopiedFrom: null as string | null, lookups: 0 };
  const handover: AccountHandover = {
    claim: async (userId) => {
      if (state.owner === null) {
        state.owner = userId;
      }

      return state.owner === userId;
    },
    previousOwnerOf: async () => {
      state.lookups += 1;

      return previousOwner;
    },
    transferOnboarding: async (previousUserId) => {
      state.onboardingCopiedFrom = previousUserId;
    },
    transferDevice: async (previousUserId, userId) => {
      if (state.owner !== previousUserId) {
        return false;
      }

      state.owner = userId;

      return true;
    },
  };

  return { state, handover };
}

describe('device ownership after an account moves to a new identity', () => {
  test('keeps a device its current account already owns without asking the server', async () => {
    const { state, handover } = phone('user_live', null);

    expect(await isOwnedAfterHandover(handover, 'user_live')).toBe(true);
    expect(state.lookups).toBe(0);
  });

  test('hands the device and its onboarding to the account that replaced its owner', async () => {
    const { state, handover } = phone('user_beta', 'user_beta');

    expect(await isOwnedAfterHandover(handover, 'user_live')).toBe(true);
    expect(state.owner).toBe('user_live');
    expect(state.onboardingCopiedFrom).toBe('user_beta');
  });

  test('keeps the device foreign when the account replaced someone else', async () => {
    const { state, handover } = phone('user_alice', 'user_beta');

    expect(await isOwnedAfterHandover(handover, 'user_live')).toBe(false);
    expect(state.owner).toBe('user_alice');
  });

  test('keeps the device foreign for an account that replaced nobody', async () => {
    const { state, handover } = phone('user_alice', null);

    expect(await isOwnedAfterHandover(handover, 'user_bob')).toBe(false);
    expect(state.onboardingCopiedFrom).toBeNull();
  });
});
