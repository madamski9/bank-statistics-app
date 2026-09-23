import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { FinancialAccount } from '@/features/financial-accounts/financial-account';

import { accountCodec, type AccountChange } from './account-codec';
import { planSync, type SyncCodec, type SyncLedger, type Versioned } from './sync-plan';
import { transactionCodec, type TransactionChange } from './transaction-codec';

export interface LedgerStorage {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
}

export interface EntityPorts<Item, Change> {
  local: {
    list: () => Promise<Item[]>;
    save: (item: Item) => Promise<unknown>;
    remove: (id: string) => Promise<unknown>;
  };
  cloud: {
    list: () => Promise<(Change & Versioned)[]>;
    push: (changes: (Change & Versioned)[]) => Promise<unknown>;
  };
}

export interface SyncPorts {
  ownerId: string;
  transactions: EntityPorts<IngestionRecord, TransactionChange>;
  accounts: EntityPorts<FinancialAccount, AccountChange>;
  ledger: LedgerStorage;
  now: () => number;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  isForeignDevice: boolean;
}

type LedgerSection = 'transactions' | 'accounts';

interface StoredLedger {
  ownerId: string;
  transactions: SyncLedger;
  accounts: SyncLedger;
}

function isLedgerEntry(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as { revision?: unknown; fingerprint?: unknown };

  return (
    typeof entry.revision === 'number' &&
    (entry.fingerprint === null || typeof entry.fingerprint === 'string')
  );
}

function parseSection(value: unknown): SyncLedger {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => isLedgerEntry(entry)),
  ) as SyncLedger;
}

function parseLedger(stored: string | null): StoredLedger | null {
  if (stored === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const { ownerId, transactions, accounts } = parsed as Record<string, unknown>;

    if (typeof ownerId !== 'string') {
      return null;
    }

    return { ownerId, transactions: parseSection(transactions), accounts: parseSection(accounts) };
  } catch {
    return null;
  }
}

async function readLedger(storage: LedgerStorage): Promise<StoredLedger | null> {
  return parseLedger(await storage.read().catch(() => null));
}

function writeLedger(storage: LedgerStorage, ledger: StoredLedger): Promise<void> {
  return storage.write(JSON.stringify(ledger));
}

export async function claimDevice(storage: LedgerStorage, ownerId: string): Promise<boolean> {
  const stored = await readLedger(storage);

  if (stored === null) {
    await writeLedger(storage, { ownerId, transactions: {}, accounts: {} });

    return true;
  }

  return stored.ownerId === ownerId;
}

async function syncEntity<Item, Change extends { clientId: string }>(
  ports: EntityPorts<Item, Change>,
  codec: SyncCodec<Item, Change>,
  ledger: StoredLedger,
  section: LedgerSection,
  storage: LedgerStorage,
  now: number,
): Promise<{ pushed: number; pulled: number }> {
  const [local, remote] = await Promise.all([ports.local.list(), ports.cloud.list()]);
  const plan = planSync({ local, remote, ledger: ledger[section], now }, codec);

  for (const item of plan.saveLocally) {
    await ports.local.save(item);
  }

  for (const id of plan.removeLocally) {
    await ports.local.remove(id);
  }

  ledger[section] = plan.pulledLedger;
  await writeLedger(storage, ledger);

  if (plan.push.length > 0) {
    await ports.cloud.push(plan.push);
  }

  ledger[section] = plan.ledger;
  await writeLedger(storage, ledger);

  return {
    pushed: plan.push.length,
    pulled: plan.saveLocally.length + plan.removeLocally.length,
  };
}

export async function runSync(ports: SyncPorts): Promise<SyncResult> {
  const stored = await readLedger(ports.ledger);

  if (stored !== null && stored.ownerId !== ports.ownerId) {
    return { pushed: 0, pulled: 0, isForeignDevice: true };
  }

  const ledger = stored ?? { ownerId: ports.ownerId, transactions: {}, accounts: {} };
  const now = ports.now();
  const accounts = await syncEntity(
    ports.accounts,
    accountCodec,
    ledger,
    'accounts',
    ports.ledger,
    now,
  );
  const transactions = await syncEntity(
    ports.transactions,
    transactionCodec,
    ledger,
    'transactions',
    ports.ledger,
    now,
  );

  return {
    pushed: accounts.pushed + transactions.pushed,
    pulled: accounts.pulled + transactions.pulled,
    isForeignDevice: false,
  };
}
