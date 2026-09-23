import type { IngestionRecord } from '@bankstats/ingestion-native';

import { planSync, type PushedChange, type RemoteTransaction, type SyncLedger } from './sync-plan';

export interface LedgerStorage {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
}

export interface SyncPorts {
  ownerId: string;
  outbox: {
    list: () => Promise<IngestionRecord[]>;
    save: (record: IngestionRecord) => Promise<unknown>;
    remove: (id: string) => Promise<unknown>;
  };
  cloud: {
    list: () => Promise<RemoteTransaction[]>;
    push: (changes: PushedChange[]) => Promise<unknown>;
  };
  ledger: LedgerStorage;
  now: () => number;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  isForeignDevice: boolean;
}

interface StoredLedger {
  ownerId: string;
  entries: SyncLedger;
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

function parseLedger(stored: string | null): StoredLedger | null {
  if (stored === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const { ownerId, entries } = parsed as { ownerId?: unknown; entries?: unknown };

    if (typeof ownerId !== 'string' || typeof entries !== 'object' || entries === null) {
      return null;
    }

    return {
      ownerId,
      entries: Object.fromEntries(
        Object.entries(entries).filter(([, entry]) => isLedgerEntry(entry)),
      ) as SyncLedger,
    };
  } catch {
    return null;
  }
}

async function readLedger(storage: LedgerStorage): Promise<StoredLedger | null> {
  return parseLedger(await storage.read().catch(() => null));
}

function writeLedger(storage: LedgerStorage, ownerId: string, entries: SyncLedger): Promise<void> {
  return storage.write(JSON.stringify({ ownerId, entries }));
}

export async function claimDevice(storage: LedgerStorage, ownerId: string): Promise<boolean> {
  const stored = await readLedger(storage);

  if (stored === null) {
    await writeLedger(storage, ownerId, {});

    return true;
  }

  return stored.ownerId === ownerId;
}

export async function runSync(ports: SyncPorts): Promise<SyncResult> {
  const stored = await readLedger(ports.ledger);

  if (stored !== null && stored.ownerId !== ports.ownerId) {
    return { pushed: 0, pulled: 0, isForeignDevice: true };
  }

  const [local, remote] = await Promise.all([ports.outbox.list(), ports.cloud.list()]);
  const plan = planSync({ local, remote, ledger: stored?.entries ?? {}, now: ports.now() });

  for (const record of plan.saveLocally) {
    await ports.outbox.save(record);
  }

  for (const id of plan.removeLocally) {
    await ports.outbox.remove(id);
  }

  await writeLedger(ports.ledger, ports.ownerId, plan.pulledLedger);

  if (plan.push.length > 0) {
    await ports.cloud.push(plan.push);
  }

  await writeLedger(ports.ledger, ports.ownerId, plan.ledger);

  return {
    pushed: plan.push.length,
    pulled: plan.saveLocally.length + plan.removeLocally.length,
    isForeignDevice: false,
  };
}
