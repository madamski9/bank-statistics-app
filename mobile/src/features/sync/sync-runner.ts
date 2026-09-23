import type { IngestionRecord } from '@bankstats/ingestion-native';

import { planSync, type PushedChange, type RemoteTransaction, type SyncLedger } from './sync-plan';

export interface SyncPorts {
  outbox: {
    list: () => Promise<IngestionRecord[]>;
    save: (record: IngestionRecord) => Promise<unknown>;
    remove: (id: string) => Promise<unknown>;
  };
  cloud: {
    list: () => Promise<RemoteTransaction[]>;
    push: (changes: PushedChange[]) => Promise<unknown>;
  };
  ledger: {
    read: () => Promise<string | null>;
    write: (value: string) => Promise<void>;
  };
  now: () => number;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
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

export function parseLedger(stored: string | null): SyncLedger {
  if (stored === null) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([, entry]) => isLedgerEntry(entry)),
    ) as SyncLedger;
  } catch {
    return {};
  }
}

export async function runSync(ports: SyncPorts): Promise<SyncResult> {
  const ledger = parseLedger(await ports.ledger.read().catch(() => null));
  const [local, remote] = await Promise.all([ports.outbox.list(), ports.cloud.list()]);
  const plan = planSync({ local, remote, ledger, now: ports.now() });

  for (const record of plan.saveLocally) {
    await ports.outbox.save(record);
  }

  for (const id of plan.removeLocally) {
    await ports.outbox.remove(id);
  }

  await ports.ledger.write(JSON.stringify(plan.pulledLedger));

  if (plan.push.length > 0) {
    await ports.cloud.push(plan.push);
  }

  await ports.ledger.write(JSON.stringify(plan.ledger));

  return {
    pushed: plan.push.length,
    pulled: plan.saveLocally.length + plan.removeLocally.length,
  };
}
