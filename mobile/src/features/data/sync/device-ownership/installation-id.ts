import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const installationKey = 'bankstats.installation-id';

function newInstallationId(): string {
  return `installation-${Crypto.randomUUID()}`;
}

export async function loadInstallationId(): Promise<string> {
  const stored = await SecureStore.getItemAsync(installationKey);

  if (stored !== null) {
    return stored;
  }

  const created = newInstallationId();
  await SecureStore.setItemAsync(installationKey, created);

  return created;
}

export async function forgetInstallationId(): Promise<void> {
  await SecureStore.deleteItemAsync(installationKey);
}
