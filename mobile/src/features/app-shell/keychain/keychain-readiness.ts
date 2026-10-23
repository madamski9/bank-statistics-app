const probeValue = 'unlocked';
const failuresBeforeGivingUpWhileActive = 5;

export interface KeychainProbe {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  isAppActive: () => boolean;
  wait: () => Promise<void>;
}

async function canUseKeychain(probe: KeychainProbe): Promise<boolean> {
  try {
    if ((await probe.read()) !== probeValue) {
      await probe.write(probeValue);
    }

    return true;
  } catch {
    return false;
  }
}

export async function waitForUnlockedKeychain(probe: KeychainProbe): Promise<void> {
  let failuresWhileActive = 0;

  while (!(await canUseKeychain(probe))) {
    if (probe.isAppActive()) {
      failuresWhileActive += 1;
    }

    if (failuresWhileActive >= failuresBeforeGivingUpWhileActive) {
      return;
    }

    await probe.wait();
  }
}
