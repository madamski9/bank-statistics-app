import { File, Paths } from 'expo-file-system';

import type { LedgerStorage } from './sync-runner';

function ledgerFile(): File {
  return new File(Paths.document, 'bankstats-sync-ledger.json');
}

export const fileLedgerStorage: LedgerStorage = {
  read: async () => {
    const file = ledgerFile();

    return file.exists ? file.text() : null;
  },
  write: async (value) => {
    const file = ledgerFile();

    if (!file.exists) {
      file.create();
    }

    file.write(value);
  },
};
