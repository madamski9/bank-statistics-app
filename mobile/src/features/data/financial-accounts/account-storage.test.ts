import { describe, expect, test } from 'bun:test';

import {
  loadAccounts,
  readAccounts,
  removeAccount,
  saveAccounts,
  upsertAccount,
  type AccountStorage,
} from './account-storage';

function memoryStorage(initial: string | null = null): AccountStorage & { value: string | null } {
  const storage = {
    value: initial,
    read: async () => storage.value,
    write: async (value: string) => {
      storage.value = value;
    },
  };

  return storage;
}

describe('account storage', () => {
  test('round-trips accounts', async () => {
    const storage = memoryStorage();
    const accounts = [{ id: 'account-a', bank: 'manual' as const, name: 'Wspólne', isGeneral: false }];

    await saveAccounts(storage, accounts);

    expect(await loadAccounts(storage)).toEqual(accounts);
  });

  test('refuses to read or overwrite a document it cannot parse', async () => {
    const storage = memoryStorage('{oops');

    await expect(readAccounts(storage)).rejects.toThrow();
    await expect(
      upsertAccount(storage, { id: 'account-a', bank: 'manual', name: 'A', isGeneral: false }),
    ).rejects.toThrow();

    expect(storage.value).toBe('{oops');
    expect(await readAccounts(memoryStorage())).toEqual([]);
  });

  test('drops malformed entries and survives unreadable storage', async () => {
    expect(
      await loadAccounts(memoryStorage('[{"id":"account-a","bank":"manual","name":"A","isGeneral":false},{"id":3}]')),
    ).toHaveLength(1);
    expect(await loadAccounts(memoryStorage('{oops'))).toEqual([]);
    expect(
      await loadAccounts({
        read: async () => {
          throw new Error('locked');
        },
        write: async () => undefined,
      }),
    ).toEqual([]);
  });

  test('replaces an account with the same id and removes one by id', async () => {
    const storage = memoryStorage();
    await upsertAccount(storage, { id: 'account-a', bank: 'manual', name: 'Stara', isGeneral: false });
    await upsertAccount(storage, { id: 'account-a', bank: 'manual', name: 'Nowa', isGeneral: false });
    await upsertAccount(storage, { id: 'account-b', bank: 'manual', name: 'Inna', isGeneral: false });

    expect((await loadAccounts(storage)).map((account) => account.name)).toEqual(['Nowa', 'Inna']);

    await removeAccount(storage, 'account-a');

    expect((await loadAccounts(storage)).map((account) => account.id)).toEqual(['account-b']);
  });

  test('keeps both accounts when two writes overlap', async () => {
    const storage = memoryStorage();
    const slowStorage: AccountStorage = {
      read: async () => {
        const snapshot = storage.value;
        await new Promise((resolve) => setTimeout(resolve, 5));

        return snapshot;
      },
      write: storage.write,
    };

    await Promise.all([
      upsertAccount(slowStorage, { id: 'account-a', bank: 'manual', name: 'A', isGeneral: false }),
      upsertAccount(slowStorage, { id: 'account-b', bank: 'manual', name: 'B', isGeneral: false }),
    ]);

    expect((await loadAccounts(storage)).map((account) => account.id).sort()).toEqual([
      'account-a',
      'account-b',
    ]);
  });
});
