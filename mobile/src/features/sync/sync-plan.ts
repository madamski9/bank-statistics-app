export interface Tombstone {
  clientId: string;
  revision: number;
  deleted: true;
}

export type Revised<Change> = Change & { revision: number; deleted: false };

export type SyncedChange<Change> = Revised<Change> | Tombstone;

export interface SyncCodec<Item, Change extends { clientId: string }> {
  includes: (item: Item) => boolean;
  idOf: (item: Item) => string;
  toChange: (item: Item) => Change;
  fromChange: (change: Change) => Item;
  isPushable: (change: Revised<Change>) => boolean;
}

export interface LedgerEntry {
  revision: number;
  fingerprint: string | null;
}

export type SyncLedger = Record<string, LedgerEntry>;

export interface SyncPlan<Item, Change> {
  saveLocally: Item[];
  removeLocally: string[];
  push: SyncedChange<Change>[];
  pulledLedger: SyncLedger;
  ledger: SyncLedger;
}

interface SyncInput<Item, Change> {
  local: Item[];
  remote: SyncedChange<Change>[];
  ledger: SyncLedger;
  now: number;
}

export function withoutUndefined<Shape extends object>(shape: Shape): Shape {
  return Object.fromEntries(
    Object.entries(shape).filter(([, value]) => value !== undefined),
  ) as Shape;
}

export function fingerprintOf(change: object): string {
  const serialized = JSON.stringify(Object.entries(withoutUndefined(change)).sort());
  let hash = 0x811c9dc5;

  for (let index = 0; index < serialized.length; index += 1) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), 0x01000193) >>> 0;
  }

  return `${serialized.length.toString(36)}-${hash.toString(36)}`;
}

export function planSync<Item, Change extends { clientId: string }>(
  { local, remote, ledger, now }: SyncInput<Item, Change>,
  codec: SyncCodec<Item, Change>,
): SyncPlan<Item, Change> {
  const localById = new Map(
    local.filter(codec.includes).map((item) => [codec.idOf(item), item]),
  );
  const remoteById = new Map(remote.map((change) => [change.clientId, change]));
  const clientIds = new Set([...localById.keys(), ...remoteById.keys(), ...Object.keys(ledger)]);
  const plan: SyncPlan<Item, Change> = {
    saveLocally: [],
    removeLocally: [],
    push: [],
    pulledLedger: { ...ledger },
    ledger: { ...ledger },
  };

  for (const clientId of clientIds) {
    const localItem = localById.get(clientId);
    const remoteChange = remoteById.get(clientId);
    const entry = ledger[clientId];
    const localFingerprint =
      localItem === undefined ? null : fingerprintOf(codec.toChange(localItem));
    const remoteItem =
      remoteChange === undefined || remoteChange.deleted ? undefined : codec.fromChange(remoteChange as Change);
    const remoteFingerprint =
      remoteItem === undefined ? null : fingerprintOf(codec.toChange(remoteItem));

    const localChanged =
      entry === undefined
        ? localItem !== undefined && remoteChange === undefined
        : localFingerprint !== entry.fingerprint;
    const remoteChanged =
      remoteChange !== undefined &&
      (entry === undefined ||
        remoteChange.revision > entry.revision ||
        (remoteChange.revision === entry.revision && remoteFingerprint !== entry.fingerprint));

    if (remoteChange !== undefined && localFingerprint === remoteFingerprint) {
      if (localChanged || remoteChanged) {
        const adopted = { revision: remoteChange.revision, fingerprint: remoteFingerprint };
        plan.pulledLedger[clientId] = adopted;
        plan.ledger[clientId] = adopted;
      }

      continue;
    }

    if (remoteChanged && !localChanged) {
      if (remoteItem === undefined) {
        plan.removeLocally.push(clientId);
      } else {
        plan.saveLocally.push(remoteItem);
      }

      const pulled = { revision: remoteChange.revision, fingerprint: remoteFingerprint };
      plan.pulledLedger[clientId] = pulled;
      plan.ledger[clientId] = pulled;
      continue;
    }

    if (!localChanged) {
      if (remoteChange === undefined && localItem === undefined && entry?.fingerprint === null) {
        delete plan.pulledLedger[clientId];
        delete plan.ledger[clientId];
      }

      continue;
    }

    const revision = Math.max(
      now,
      (entry?.revision ?? 0) + 1,
      (remoteChange?.revision ?? 0) + 1,
    );

    plan.push.push(
      localItem === undefined
        ? { clientId, revision, deleted: true }
        : { ...codec.toChange(localItem), revision, deleted: false },
    );
    plan.ledger[clientId] = { revision, fingerprint: localFingerprint };
  }

  return plan;
}

export function isPushable<Item, Change extends { clientId: string }>(
  codec: SyncCodec<Item, Change>,
  change: SyncedChange<Change>,
): boolean {
  return change.deleted || codec.isPushable(change);
}
