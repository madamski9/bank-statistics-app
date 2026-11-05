import { parseDocumentList } from '@/features/data/local-storage/document-list';

import { isFinancialAccountBank, type FinancialAccount } from './financial-account';

export interface AccountStorage {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
}

function isFinancialAccount(value: unknown): value is FinancialAccount {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const account = value as Partial<FinancialAccount>;

  return (
    typeof account.id === 'string' &&
    isFinancialAccountBank(account.bank) &&
    typeof account.name === 'string' &&
    typeof account.isGeneral === 'boolean'
  );
}

export async function readAccounts(storage: AccountStorage): Promise<FinancialAccount[]> {
  return parseDocumentList(await storage.read(), isFinancialAccount);
}

export async function loadAccounts(storage: AccountStorage): Promise<FinancialAccount[]> {
  try {
    return await readAccounts(storage);
  } catch {
    return [];
  }
}

export function saveAccounts(storage: AccountStorage, accounts: FinancialAccount[]): Promise<void> {
  return storage.write(JSON.stringify(accounts));
}

const pendingUpdates = new WeakMap<AccountStorage, Promise<unknown>>();

function updateAccounts(
  storage: AccountStorage,
  change: (accounts: FinancialAccount[]) => FinancialAccount[],
): Promise<void> {
  const previous = pendingUpdates.get(storage) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => saveAccounts(storage, change(await readAccounts(storage))));

  pendingUpdates.set(storage, next);

  return next;
}

export function upsertAccount(storage: AccountStorage, account: FinancialAccount): Promise<void> {
  return updateAccounts(storage, (accounts) =>
    accounts.some((candidate) => candidate.id === account.id)
      ? accounts.map((candidate) => (candidate.id === account.id ? account : candidate))
      : [...accounts, account],
  );
}

export function removeAccount(storage: AccountStorage, id: string): Promise<void> {
  return updateAccounts(storage, (accounts) => accounts.filter((account) => account.id !== id));
}
