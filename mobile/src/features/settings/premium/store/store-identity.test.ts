import { describe, expect, test } from 'bun:test';

import { storeIdentity } from './store-identity';

function recordingSdk() {
  const calls: string[] = [];

  return {
    calls,
    sdk: {
      configure: (customerId: string) => {
        calls.push(`configure ${customerId}`);
      },
      logIn: async (customerId: string) => {
        calls.push(`logIn ${customerId}`);
      },
      logOut: async () => {
        calls.push('logOut');
      },
    },
  };
}

describe('store identity', () => {
  test('stops identifying a deleted or signed-out customer with the store', async () => {
    const { calls, sdk } = recordingSdk();
    const identity = storeIdentity(sdk);

    await identity.identify('user_alice');
    await identity.forget();
    await identity.forget();

    expect(calls).toEqual(['configure user_alice', 'logOut']);
  });

  test('logs the next customer in without configuring the store twice', async () => {
    const { calls, sdk } = recordingSdk();
    const identity = storeIdentity(sdk);

    await identity.identify('user_alice');
    await identity.identify('user_alice');
    await Promise.all([identity.forget(), identity.identify('user_bob')]);

    expect(calls).toEqual(['configure user_alice', 'logOut', 'logIn user_bob']);
  });

  test('forgets the customer even when the store cannot log out', async () => {
    const { calls, sdk } = recordingSdk();
    const identity = storeIdentity({
      ...sdk,
      logOut: async () => {
        throw new Error('anonymous');
      },
    });

    await identity.identify('user_alice');
    await identity.forget();
    await identity.identify('user_alice');

    expect(calls).toEqual(['configure user_alice', 'logIn user_alice']);
  });
});
