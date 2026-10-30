import { newOwner } from '../convex/owners';

export type Row = Record<string, unknown>;
export type Snapshot = Record<string, Row[]>;

export const ownedTables = [
  'transactions',
  'financialAccounts',
  'categories',
  'events',
  'devices',
  'diagnosticSamples',
  'profiles',
  'owners',
] as const;

export const sharedTables = ['premiumCodes', 'exchangeRates'] as const;

export interface MigratedSnapshot {
  snapshot: Snapshot;
  leftBehind: string[];
}

const knownTables = new Set<string>([...ownedTables, ...sharedTables]);

function ownerOf(row: Row): string {
  if (typeof row.ownerId !== 'string') {
    throw new Error(`Row ${String(row._id)} has no ownerId`);
  }

  return row.ownerId;
}

function hadPremium(profile: Row): boolean {
  const subscription = profile.storeSubscription;
  const hasActiveSubscription =
    typeof subscription === 'object' && subscription !== null && 'isActive' in subscription && subscription.isActive === true;

  return profile.isPremium === true || hasActiveSubscription;
}

function lifetimePremium(profile: Row): Row {
  const { storeSubscription, storeSubscriptionRecheck, premiumUntil, ...kept } = profile;

  if (!hadPremium(profile)) {
    return { ...kept, isPremium: false };
  }

  return { ...kept, isPremium: true, premiumSince: kept.premiumSince ?? kept._creationTime };
}

export function migrateSnapshot(beta: Snapshot, ownerIds: ReadonlyMap<string, string>, now: number): MigratedSnapshot {
  const unknown = Object.keys(beta).filter((table) => !knownTables.has(table));

  if (unknown.length > 0) {
    throw new Error(`Unknown tables in the snapshot: ${unknown.join(', ')}`);
  }

  const leftBehind = new Set<string>();
  const snapshot: Snapshot = {};

  for (const table of ownedTables) {
    snapshot[table] = (beta[table] ?? []).flatMap((row) => {
      const previousOwnerId = ownerOf(row);
      const ownerId = ownerIds.get(previousOwnerId);

      if (ownerId === undefined) {
        leftBehind.add(previousOwnerId);

        return [];
      }

      const moved = { ...row, ownerId };

      if (table === 'owners') {
        return [{ ...moved, legacyOwnerId: previousOwnerId }];
      }

      return [table === 'profiles' ? lifetimePremium(moved) : moved];
    });
  }

  const ownersWithRows = new Set((snapshot.owners ?? []).map(ownerOf));

  for (const [legacyOwnerId, ownerId] of ownerIds) {
    if (!ownersWithRows.has(ownerId)) {
      snapshot.owners?.push({ ...newOwner(ownerId, now), legacyOwnerId });
    }
  }

  for (const table of sharedTables) {
    snapshot[table] = [...(beta[table] ?? [])];
  }

  return { snapshot, leftBehind: [...leftBehind].sort() };
}

export type OwnerCounts = Record<string, Record<string, number>>;

export function countByOwner(snapshot: Snapshot): OwnerCounts {
  const counts: OwnerCounts = {};

  for (const table of ownedTables) {
    for (const row of snapshot[table] ?? []) {
      const owner = (counts[ownerOf(row)] ??= {});
      const key = row.deleted === true ? `${table} (deleted)` : table;
      owner[key] = (owner[key] ?? 0) + 1;
    }
  }

  return counts;
}
