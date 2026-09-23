import type { IngestionRecord } from '@bankstats/ingestion-native';

export interface TransactionChange {
  clientId: string;
  bank: IngestionRecord['bank'];
  origin: 'manual';
  direction: IngestionRecord['direction'];
  transactionType?: IngestionRecord['transactionType'];
  amountMinor: number;
  currency: string;
  merchant?: string;
  category?: string;
  accountName?: string;
  occurredAt: string;
  capturedAt: string;
  status: IngestionRecord['status'];
}

export interface RemoteTransaction extends Omit<TransactionChange, 'bank' | 'origin'> {
  bank: string;
  origin: 'capture' | 'manual';
  revision: number;
  deleted: boolean;
}

export type PushedChange = TransactionChange & { revision: number; deleted: boolean };

export interface LedgerEntry {
  revision: number;
  fingerprint: string | null;
}

export type SyncLedger = Record<string, LedgerEntry>;

export interface SyncPlan {
  saveLocally: IngestionRecord[];
  removeLocally: string[];
  push: PushedChange[];
  pulledLedger: SyncLedger;
  ledger: SyncLedger;
}

interface SyncInput {
  local: IngestionRecord[];
  remote: RemoteTransaction[];
  ledger: SyncLedger;
  now: number;
}

function withoutUndefined<Shape extends object>(shape: Shape): Shape {
  return Object.fromEntries(
    Object.entries(shape).filter(([, value]) => value !== undefined),
  ) as Shape;
}

export function changeFromRecord(record: IngestionRecord): TransactionChange {
  return withoutUndefined({
    clientId: record.id,
    bank: record.bank,
    origin: 'manual',
    direction: record.direction,
    transactionType: record.transactionType,
    amountMinor: record.amountMinor,
    currency: record.currency,
    merchant: record.merchant,
    category: record.category,
    accountName: record.accountName,
    occurredAt: record.occurredAt,
    capturedAt: record.capturedAt,
    status: record.status,
  });
}

function recordFromRemote(remote: RemoteTransaction): IngestionRecord {
  return withoutUndefined({
    id: remote.clientId,
    bank: remote.bank === 'millennium' ? 'millennium' : 'manual',
    direction: remote.direction,
    transactionType: remote.transactionType,
    amountMinor: remote.amountMinor,
    currency: remote.currency,
    merchant: remote.merchant,
    category: remote.category,
    accountName: remote.accountName,
    occurredAt: remote.occurredAt,
    capturedAt: remote.capturedAt,
    sourceApp: 'manual',
    status: remote.status,
    origin: 'manual',
  });
}

export function fingerprint(record: IngestionRecord): string {
  const serialized = JSON.stringify(Object.entries(changeFromRecord(record)).sort());
  let hash = 0x811c9dc5;

  for (let index = 0; index < serialized.length; index += 1) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), 0x01000193) >>> 0;
  }

  return `${serialized.length.toString(36)}-${hash.toString(36)}`;
}

export function planSync({ local, remote, ledger, now }: SyncInput): SyncPlan {
  const localById = new Map(
    local.filter((record) => record.origin === 'manual').map((record) => [record.id, record]),
  );
  const remoteById = new Map(
    remote.filter((change) => change.origin === 'manual').map((change) => [change.clientId, change]),
  );
  const clientIds = new Set([...localById.keys(), ...remoteById.keys(), ...Object.keys(ledger)]);
  const plan: SyncPlan = {
    saveLocally: [],
    removeLocally: [],
    push: [],
    pulledLedger: { ...ledger },
    ledger: { ...ledger },
  };

  for (const clientId of clientIds) {
    const localRecord = localById.get(clientId);
    const remoteChange = remoteById.get(clientId);
    const entry = ledger[clientId];
    const localFingerprint = localRecord === undefined ? null : fingerprint(localRecord);
    const remoteRecord =
      remoteChange === undefined || remoteChange.deleted ? undefined : recordFromRemote(remoteChange);
    const remoteFingerprint = remoteRecord === undefined ? null : fingerprint(remoteRecord);

    const localChanged =
      entry === undefined ? localRecord !== undefined : localFingerprint !== entry.fingerprint;
    const remoteChanged =
      remoteChange !== undefined && (entry === undefined || remoteChange.revision > entry.revision);

    if (remoteChange !== undefined && localFingerprint === remoteFingerprint) {
      if (localChanged || remoteChanged) {
        const adopted = { revision: remoteChange.revision, fingerprint: remoteFingerprint };
        plan.pulledLedger[clientId] = adopted;
        plan.ledger[clientId] = adopted;
      }

      continue;
    }

    if (remoteChanged && !localChanged) {
      if (remoteRecord === undefined) {
        plan.removeLocally.push(clientId);
      } else {
        plan.saveLocally.push(remoteRecord);
      }

      const pulled = { revision: remoteChange.revision, fingerprint: remoteFingerprint };
      plan.pulledLedger[clientId] = pulled;
      plan.ledger[clientId] = pulled;
      continue;
    }

    if (!localChanged) {
      continue;
    }

    const source = localRecord ?? remoteRecord;

    if (source === undefined) {
      delete plan.pulledLedger[clientId];
      delete plan.ledger[clientId];
      continue;
    }

    const revision = Math.max(
      now,
      (entry?.revision ?? 0) + 1,
      (remoteChange?.revision ?? 0) + 1,
    );

    plan.push.push({ ...changeFromRecord(source), revision, deleted: localRecord === undefined });
    plan.ledger[clientId] = { revision, fingerprint: localFingerprint };
  }

  return plan;
}
