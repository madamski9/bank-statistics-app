const probeValue = 'unlocked';
const failuresBeforeGivingUpWhileActive = 5;

export interface KeychainRetry {
  canWaitForUnlock: () => boolean;
  isAppActive: () => boolean;
  wait: () => Promise<void>;
}

export interface KeychainProbe extends KeychainRetry {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
}

export type KeychainRead<Value> = { status: 'read'; value: Value } | { status: 'unavailable' };

export async function readWhenUnlocked<Value>(
  read: () => Promise<Value>,
  retry: KeychainRetry,
  isCancelled: () => boolean = () => false,
): Promise<KeychainRead<Value>> {
  let failuresWhileActive = 0;

  for (;;) {
    try {
      return { status: 'read', value: await read() };
    } catch {
      if (!retry.canWaitForUnlock() || isCancelled()) {
        return { status: 'unavailable' };
      }

      if (retry.isAppActive()) {
        failuresWhileActive += 1;
      }

      if (failuresWhileActive >= failuresBeforeGivingUpWhileActive) {
        return { status: 'unavailable' };
      }

      await retry.wait();
    }
  }
}

export async function waitForUnlockedKeychain(probe: KeychainProbe): Promise<boolean> {
  const result = await readWhenUnlocked(async () => {
    if ((await probe.read()) !== probeValue) {
      await probe.write(probeValue);
    }
  }, probe);

  return result.status === 'read';
}
