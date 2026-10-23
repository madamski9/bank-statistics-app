import { describe, expect, test } from 'bun:test';

import { waitForUnlockedKeychain, type KeychainProbe } from './keychain-readiness';

interface Phone {
  isLocked: boolean;
  isAppActive: boolean;
  stored: string | null;
  waits: number;
}

function probeOf(phone: Phone, onWait: (phone: Phone) => void = () => undefined): KeychainProbe {
  const refuseWhileLocked = () => {
    if (phone.isLocked) {
      throw new Error('User interaction is not allowed.');
    }
  };

  return {
    read: async () => {
      refuseWhileLocked();
      return phone.stored;
    },
    write: async (value) => {
      refuseWhileLocked();
      phone.stored = value;
    },
    isAppActive: () => phone.isAppActive,
    wait: async () => {
      phone.waits += 1;
      onWait(phone);
    },
  };
}

describe('keychain readiness', () => {
  test('continues at once when the keychain can be read', async () => {
    const phone: Phone = { isLocked: false, isAppActive: true, stored: 'unlocked', waits: 0 };

    await waitForUnlockedKeychain(probeOf(phone));

    expect(phone.waits).toBe(0);
  });

  test('records the probe on the first launch so later launches can read it', async () => {
    const phone: Phone = { isLocked: false, isAppActive: true, stored: null, waits: 0 };

    await waitForUnlockedKeychain(probeOf(phone));

    expect(phone.stored).toBe('unlocked');
  });

  test('waits in the background until the phone is unlocked', async () => {
    const phone: Phone = { isLocked: true, isAppActive: false, stored: 'unlocked', waits: 0 };

    await waitForUnlockedKeychain(
      probeOf(phone, (current) => {
        if (current.waits === 30) {
          current.isLocked = false;
        }
      }),
    );

    expect(phone.waits).toBe(30);
  });

  test('stops waiting when the keychain keeps failing while the app is in use', async () => {
    const phone: Phone = { isLocked: true, isAppActive: true, stored: 'unlocked', waits: 0 };

    await waitForUnlockedKeychain(probeOf(phone));

    expect(phone.waits).toBe(4);
  });
});
