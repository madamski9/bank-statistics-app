import { maximumChangesPerPush } from '@bankstats/convex/convex/changeRules';
import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CustomCategory } from '@/features/classification/categories';
import type { SpendingEvent } from '@/features/events/spending-event';
import type { FinancialAccount } from '@/features/financial-accounts/financial-account';

import { accountCodec, type AccountChange } from './account-codec';
import { categoryCodec, type CategoryChange } from './category-codec';
import { eventCodec, type EventChange } from './event-codec';
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
  categories: EntityPorts<CustomCategory, CategoryChange>;
  events: EntityPorts<SpendingEvent, EventChange>;
  ledger: LedgerStorage;
  now: () => number;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  isForeignDevice: boolean;
}

const ledgerSections = ['transactions', 'accounts', 'categories', 'events'] as const;

type LedgerSection = (typeof ledgerSections)[number];

type StoredLedger = { ownerId: string } & Record<LedgerSection, SyncLedger>;

function emptyLedger(ownerId: string): StoredLedger {
  return { ownerId, transactions: {}, accounts: {}, categories: {}, events: {} };
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

type LedgerReading = { kind: 'missing' } | { kind: 'unreadable' } | { kind: 'owned'; ledger: StoredLedger };

function parseLedger(stored: string): StoredLedger | null {
  try {
    const parsed: unknown = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const sections = parsed as Record<string, unknown>;
    const ownerId = sections.ownerId;

    if (typeof ownerId !== 'string') {
      return null;
    }

    const ledger = emptyLedger(ownerId);

    for (const section of ledgerSections) {
      ledger[section] = parseSection(sections[section]);
    }

    return ledger;
  } catch {
    return null;
  }
}

async function readLedger(storage: LedgerStorage): Promise<LedgerReading> {
  let stored: string | null;

  try {
    stored = await storage.read();
  } catch {
    return { kind: 'unreadable' };
  }

  if (stored === null) {
    return { kind: 'missing' };
  }

  const ledger = parseLedger(stored);

  return ledger === null ? { kind: 'unreadable' } : { kind: 'owned', ledger };
}

function writeLedger(storage: LedgerStorage, ledger: StoredLedger): Promise<void> {
  return storage.write(JSON.stringify(ledger));
}

export async function claimDevice(storage: LedgerStorage, ownerId: string): Promise<boolean> {
  const reading = await readLedger(storage);

  if (reading.kind === 'missing') {
    await writeLedger(storage, emptyLedger(ownerId));

    return true;
  }

  return reading.kind === 'owned' && reading.ledger.ownerId === ownerId;
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

  const pushable = plan.push.filter(codec.isPushable);

  for (let start = 0; start < pushable.length; start += maximumChangesPerPush) {
    await ports.cloud.push(pushable.slice(start, start + maximumChangesPerPush));
  }

  ledger[section] = plan.ledger;
  await writeLedger(storage, ledger);

  return {
    pushed: pushable.length,
    pulled: plan.saveLocally.length + plan.removeLocally.length,
  };
}

export async function runSync(ports: SyncPorts): Promise<SyncResult> {
  const reading = await readLedger(ports.ledger);

  if (
    reading.kind === 'unreadable' ||
    (reading.kind === 'owned' && reading.ledger.ownerId !== ports.ownerId)
  ) {
    return { pushed: 0, pulled: 0, isForeignDevice: true };
  }

  const ledger = reading.kind === 'owned' ? reading.ledger : emptyLedger(ports.ownerId);
  const now = ports.now();
  const accounts = await syncEntity(
    ports.accounts,
    accountCodec,
    ledger,
    'accounts',
    ports.ledger,
    now,
  );
  const categories = await syncEntity(
    ports.categories,
    categoryCodec,
    ledger,
    'categories',
    ports.ledger,
    now,
  );
  const events = await syncEntity(ports.events, eventCodec, ledger, 'events', ports.ledger, now);
  const transactions = await syncEntity(
    ports.transactions,
    transactionCodec,
    ledger,
    'transactions',
    ports.ledger,
    now,
  );
  const results = [accounts, categories, events, transactions];

  return {
    pushed: results.reduce((sum, result) => sum + result.pushed, 0),
    pulled: results.reduce((sum, result) => sum + result.pulled, 0),
    isForeignDevice: false,
  };
}

export async function forgetSyncedState(storage: LedgerStorage, ownerId: string): Promise<void> {
  await writeLedger(storage, emptyLedger(ownerId));
}
