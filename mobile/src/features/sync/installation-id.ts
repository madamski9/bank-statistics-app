import * as SecureStore from 'expo-secure-store';

const installationKey = 'bankstats.installation-id';

function newInstallationId(): string {
  const randomPart = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(36)
      .padStart(7, '0'),
  ).join('');

  return `installation-${Date.now().toString(36)}-${randomPart}`;
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
