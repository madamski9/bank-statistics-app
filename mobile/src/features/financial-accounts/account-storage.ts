import type { FinancialAccount } from './financial-account';

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
    (account.bank === 'manual' || account.bank === 'millennium') &&
    typeof account.name === 'string' &&
    typeof account.isGeneral === 'boolean'
  );
}

export async function loadAccounts(storage: AccountStorage): Promise<FinancialAccount[]> {
  try {
    const stored = await storage.read();

    if (stored === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed.filter(isFinancialAccount) : [];
  } catch {
    return [];
  }
}

export function saveAccounts(storage: AccountStorage, accounts: FinancialAccount[]): Promise<void> {
  return storage.write(JSON.stringify(accounts));
}

export async function upsertAccount(storage: AccountStorage, account: FinancialAccount): Promise<void> {
  const accounts = await loadAccounts(storage);
  const index = accounts.findIndex((candidate) => candidate.id === account.id);
  const next =
    index === -1
      ? [...accounts, account]
      : accounts.map((candidate, position) => (position === index ? account : candidate));

  await saveAccounts(storage, next);
}

export async function removeAccount(storage: AccountStorage, id: string): Promise<void> {
  const accounts = await loadAccounts(storage);

  await saveAccounts(
    storage,
    accounts.filter((account) => account.id !== id),
  );
}
