import { File, Paths } from 'expo-file-system';

import type { AccountStorage } from './account-storage';

function accountsFile(): File {
  return new File(Paths.document, 'bankstats-financial-accounts.json');
}

export const fileAccountStorage: AccountStorage = {
  read: async () => {
    const file = accountsFile();

    return file.exists ? file.text() : null;
  },
  write: async (value) => {
    const file = accountsFile();

    if (!file.exists) {
      file.create();
    }

    file.write(value);
  },
};

export function clearAccountStorage(): void {
  const file = accountsFile();

  if (file.exists) {
    file.delete();
  }
}
