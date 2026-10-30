import { maximumChangesPerPush } from '@bankstats/convex/convex/changeRules';
import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CustomCategory } from '@/features/data/classification/categories';
import type { SpendingEvent } from '@/features/insights/events/spending-event';
import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';

import { accountCodec, type RemoteAccount } from '../codecs/account-codec';
import { categoryCodec, type RemoteCategory } from '../codecs/category-codec';
import { eventCodec, type RemoteEvent } from '../codecs/event-codec';
import { isPushable, planSync, type SyncCodec, type SyncedChange, type SyncLedger } from './sync-plan';
import { transactionCodec, type RemoteTransaction } from '../codecs/transaction-codec';

export interface LedgerStorage {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
}

export interface LocalPort<Item> {
  list: () => Promise<Item[]>;
  save: (item: Item) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}

export interface CloudChanges {
  transactions: RemoteTransaction[];
  financialAccounts: RemoteAccount[];
  categories: RemoteCategory[];
  events: RemoteEvent[];
}

export type CloudTable = keyof CloudChanges;

export type Cursors = Record<CloudTable, number>;

export interface PulledPage {
  head: number;
  isComplete: boolean;
  cursors: Cursors;
  changes: CloudChanges;
}

export interface PushReceipt {
  sequenceBefore: number;
  sequence: number;
}

export interface CloudPort {
  pull: (cursors: Cursors) => Promise<PulledPage>;
  push: (changes: Partial<CloudChanges>) => Promise<PushReceipt>;
}

export interface SyncPorts {
  ownerId: string;
  cloud: CloudPort;
  transactions: LocalPort<IngestionRecord>;
  accounts: LocalPort<FinancialAccount>;
  categories: LocalPort<CustomCategory>;
  events: LocalPort<SpendingEvent>;
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

type StoredLedger = { ownerId: string; cursor: number } & Record<LedgerSection, SyncLedger>;

function emptyLedger(ownerId: string): StoredLedger {
  return { ownerId, cursor: 0, transactions: {}, accounts: {}, categories: {}, events: {} };
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

    if (typeof sections.cursor !== 'number') {
      return ledger;
    }

    ledger.cursor = sections.cursor;

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

export async function transferDevice(
  storage: LedgerStorage,
  previousOwnerId: string,
  ownerId: string,
): Promise<boolean> {
  const reading = await readLedger(storage);

  if (reading.kind !== 'owned' || reading.ledger.ownerId !== previousOwnerId) {
    return false;
  }

  await writeLedger(storage, { ...reading.ledger, ownerId });

  return true;
}

function emptyChanges(): CloudChanges {
  return { transactions: [], financialAccounts: [], categories: [], events: [] };
}

async function pullSince(cloud: CloudPort, cursor: number): Promise<{ head: number; changes: CloudChanges }> {
  const changes = emptyChanges();
  let cursors: Cursors = { transactions: cursor, financialAccounts: cursor, categories: cursor, events: cursor };

  for (;;) {
    const page = await cloud.pull(cursors);
    changes.transactions.push(...page.changes.transactions);
    changes.financialAccounts.push(...page.changes.financialAccounts);
    changes.categories.push(...page.changes.categories);
    changes.events.push(...page.changes.events);
    cursors = page.cursors;

    if (page.isComplete) {
      return { head: page.head, changes };
    }
  }
}

interface Reconciled<Change> {
  push: SyncedChange<Change>[];
  pulledLedger: SyncLedger;
  ledger: SyncLedger;
  pulled: number;
}

async function reconcile<Item, Change extends { clientId: string }>(
  local: LocalPort<Item>,
  codec: SyncCodec<Item, Change>,
  remote: SyncedChange<Change>[],
  ledger: SyncLedger,
  now: number,
): Promise<Reconciled<Change>> {
  const plan = planSync({ local: await local.list(), remote, ledger, now }, codec);

  for (const item of plan.saveLocally) {
    await local.save(item);
  }

  for (const id of plan.removeLocally) {
    await local.remove(id);
  }

  return {
    push: plan.push.filter((change) => isPushable(codec, change)),
    pulledLedger: plan.pulledLedger,
    ledger: plan.ledger,
    pulled: plan.saveLocally.length + plan.removeLocally.length,
  };
}

type PushEntry =
  | { table: 'transactions'; change: RemoteTransaction }
  | { table: 'financialAccounts'; change: RemoteAccount }
  | { table: 'categories'; change: RemoteCategory }
  | { table: 'events'; change: RemoteEvent };

function batchOf(entries: PushEntry[]): Partial<CloudChanges> {
  const batch = emptyChanges();

  for (const entry of entries) {
    switch (entry.table) {
      case 'transactions':
        batch.transactions.push(entry.change);
        break;
      case 'financialAccounts':
        batch.financialAccounts.push(entry.change);
        break;
      case 'categories':
        batch.categories.push(entry.change);
        break;
      case 'events':
        batch.events.push(entry.change);
        break;
    }
  }

  return Object.fromEntries(Object.entries(batch).filter(([, changes]) => changes.length > 0));
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
  const remote = await pullSince(ports.cloud, ledger.cursor);
  const accounts = await reconcile(ports.accounts, accountCodec, remote.changes.financialAccounts, ledger.accounts, now);
  const categories = await reconcile(ports.categories, categoryCodec, remote.changes.categories, ledger.categories, now);
  const events = await reconcile(ports.events, eventCodec, remote.changes.events, ledger.events, now);
  const transactions = await reconcile(
    ports.transactions,
    transactionCodec,
    remote.changes.transactions,
    ledger.transactions,
    now,
  );

  ledger.cursor = remote.head;
  ledger.accounts = accounts.pulledLedger;
  ledger.categories = categories.pulledLedger;
  ledger.events = events.pulledLedger;
  ledger.transactions = transactions.pulledLedger;
  await writeLedger(ports.ledger, ledger);

  const entries: PushEntry[] = [
    ...accounts.push.map((change) => ({ table: 'financialAccounts' as const, change })),
    ...categories.push.map((change) => ({ table: 'categories' as const, change })),
    ...events.push.map((change) => ({ table: 'events' as const, change })),
    ...transactions.push.map((change) => ({ table: 'transactions' as const, change })),
  ];
  let cursor = remote.head;
  let isContiguous = true;

  for (let start = 0; start < entries.length; start += maximumChangesPerPush) {
    const receipt = await ports.cloud.push(batchOf(entries.slice(start, start + maximumChangesPerPush)));
    isContiguous &&= receipt.sequenceBefore === cursor;

    if (isContiguous) {
      cursor = receipt.sequence;
    }
  }

  ledger.cursor = cursor;
  ledger.accounts = accounts.ledger;
  ledger.categories = categories.ledger;
  ledger.events = events.ledger;
  ledger.transactions = transactions.ledger;
  await writeLedger(ports.ledger, ledger);

  return {
    pushed: entries.length,
    pulled: [accounts, categories, events, transactions].reduce((sum, result) => sum + result.pulled, 0),
    isForeignDevice: false,
  };
}

export async function forgetSyncedState(storage: LedgerStorage, ownerId: string): Promise<void> {
  await writeLedger(storage, emptyLedger(ownerId));
}
