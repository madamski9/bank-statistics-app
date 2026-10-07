import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import type { CustomCategory } from '@/features/classification/categories';
import type { SpendingEvent } from '@/features/events/spending-event';
import type { FinancialAccount } from '@/features/financial-accounts/financial-account';

import {
  claimDevice,
  forgetSyncedState,
  runSync,
  type CloudChanges,
  type CloudPort,
  type CloudTable,
  type SyncPorts,
} from './sync-runner';
import type { RemoteTransaction } from './transaction-codec';

const pageSize = 500;
const cloudTables: CloudTable[] = ['transactions', 'financialAccounts', 'categories', 'events'];

function manual(id: string, overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id,
    bank: 'manual',
    direction: 'expense',
    amountMinor: 3450,
    currency: 'PLN',
    accountId: 'general-manual',
    occurredAt: '2026-09-20T12:30:00.000Z',
    capturedAt: '2026-09-20T12:31:00.000Z',
    sourceApp: 'manual',
    status: 'posted',
    origin: 'manual',
    ...overrides,
  };
}

type StoredChange = CloudChanges[CloudTable][number] & { sequence: number };

function createCloud() {
  let online = true;
  let sequence = 0;
  const pulls: number[] = [];
  const tables = Object.fromEntries(
    cloudTables.map((table) => [table, new Map<string, StoredChange>()]),
  ) as Record<CloudTable, Map<string, StoredChange>>;

  function assertOnline() {
    if (!online) {
      throw new Error('offline');
    }
  }

  const port: CloudPort = {
    pull: async (cursors) => {
      assertOnline();
      const pages = cloudTables.map((table) =>
        [...tables[table].values()]
          .filter((row) => row.sequence > cursors[table])
          .sort((left, right) => left.sequence - right.sequence)
          .slice(0, pageSize),
      );
      pulls.push(pages.reduce((sum, rows) => sum + rows.length, 0));
      const strip = (rows: StoredChange[]) => rows.map(({ sequence: _sequence, ...change }) => change);
      const [transactions = [], financialAccounts = [], categories = [], events = []] = pages;

      return {
        head: sequence,
        isComplete: pages.every((rows) => rows.length < pageSize),
        cursors: {
          transactions: transactions.at(-1)?.sequence ?? cursors.transactions,
          financialAccounts: financialAccounts.at(-1)?.sequence ?? cursors.financialAccounts,
          categories: categories.at(-1)?.sequence ?? cursors.categories,
          events: events.at(-1)?.sequence ?? cursors.events,
        },
        changes: {
          transactions: strip(transactions) as CloudChanges['transactions'],
          financialAccounts: strip(financialAccounts) as CloudChanges['financialAccounts'],
          categories: strip(categories) as CloudChanges['categories'],
          events: strip(events) as CloudChanges['events'],
        },
      };
    },
    push: async (changes) => {
      assertOnline();
      const sequenceBefore = sequence;

      for (const table of cloudTables) {
        for (const change of changes[table] ?? []) {
          const existing = tables[table].get(change.clientId);

          if (existing === undefined || change.revision > existing.revision) {
            sequence += 1;
            tables[table].set(change.clientId, { ...change, sequence });
          }
        }
      }

      return { sequenceBefore, sequence };
    },
  };

  return {
    port,
    pulls,
    stored: tables.transactions as Map<string, RemoteTransaction & { sequence: number }>,
    clear: () => cloudTables.forEach((table) => tables[table].clear()),
    goOffline: () => {
      online = false;
    },
    goOnline: () => {
      online = true;
    },
  };
}

function createDevice(
  cloud: ReturnType<typeof createCloud>,
  records: IngestionRecord[] = [],
  ownerId = 'user_alice',
) {
  const outbox = new Map(records.map((record) => [record.id, record]));
  const accounts = new Map<string, FinancialAccount>();
  const categories = new Map<string, CustomCategory>();
  const events = new Map<string, SpendingEvent>();
  const ledger: { value: string | null } = { value: null };
  let clock = 1_800_000_000_000;

  const ports: SyncPorts = {
    ownerId,
    cloud: cloud.port,
    transactions: {
      list: async () => [...outbox.values()],
      save: async (record) => {
        outbox.set(record.id, record);
      },
      remove: async (id) => {
        outbox.delete(id);
      },
    },
    accounts: {
      list: async () => [...accounts.values()],
      save: async (account) => {
        accounts.set(account.id, account);
      },
      remove: async (id) => {
        accounts.delete(id);
      },
    },
    categories: {
      list: async () => [...categories.values()],
      save: async (category) => {
        categories.set(category.id, category);
      },
      remove: async (id) => {
        categories.delete(id);
      },
    },
    events: {
      list: async () => [...events.values()],
      save: async (event) => {
        events.set(event.id, event);
      },
      remove: async (id) => {
        events.delete(id);
      },
    },
    ledger: {
      read: async () => ledger.value,
      write: async (value) => {
        ledger.value = value;
      },
    },
    now: () => {
      clock += 1000;

      return clock;
    },
  };

  return { outbox, accounts, categories, events, ledger, ports };
}

describe('runSync', () => {
  test('brings a custom category and an event to another device', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud);
    const tablet = createDevice(cloud);
    const trip = { id: 'event-trip', name: 'Chorwacja', startedAt: '2026-07-01T08:00:00.000Z' };
    phone.categories.set('category-hobby', { id: 'category-hobby', name: 'Hobby' });
    phone.events.set(trip.id, trip);

    await runSync(phone.ports);
    await runSync(tablet.ports);

    expect([...tablet.categories.values()]).toEqual([{ id: 'category-hobby', name: 'Hobby' }]);
    expect(tablet.events.get(trip.id)).toEqual(trip);
  });

  test('uploads everything again after the cloud copy was forgotten', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);

    await runSync(phone.ports);
    cloud.clear();
    await forgetSyncedState(phone.ports.ledger, 'user_alice');
    await runSync(phone.ports);

    expect(cloud.stored.has('manual-lunch')).toBe(true);
  });

  test('brings a manual transaction from one device to another', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    const tablet = createDevice(cloud);

    await runSync(phone.ports);
    await runSync(tablet.ports);

    expect(tablet.outbox.get('manual-lunch')).toEqual(manual('manual-lunch'));
  });

  test('brings a captured Millennium transaction from a phone to another device', async () => {
    const cloud = createCloud();
    const captured = manual('capture-wallet', {
      bank: 'millennium',
      origin: 'capture',
      accountId: undefined,
      sourceApp: 'com.apple.Passbook',
      review: 'currency',
    });
    const phone = createDevice(cloud, [captured]);
    const tablet = createDevice(cloud);

    await runSync(phone.ports);
    await runSync(tablet.ports);

    expect(tablet.outbox.get(captured.id)).toEqual(captured);
    expect(cloud.stored.get(captured.id)).toMatchObject({
      origin: 'capture',
      sourceApp: 'com.apple.Passbook',
      review: 'currency',
    });
  });

  test('carries edits and removals of captured transactions across devices', async () => {
    const cloud = createCloud();
    const captured = manual('capture-wallet', {
      bank: 'millennium',
      origin: 'capture',
      accountId: undefined,
      sourceApp: 'com.apple.Passbook',
    });
    const phone = createDevice(cloud, [captured]);
    const tablet = createDevice(cloud);
    await runSync(phone.ports);
    await runSync(tablet.ports);

    tablet.outbox.set(captured.id, { ...captured, merchant: 'Poprawiony sklep' });
    await runSync(tablet.ports);
    await runSync(phone.ports);
    expect(phone.outbox.get(captured.id)?.merchant).toBe('Poprawiony sklep');

    phone.outbox.delete(captured.id);
    await runSync(phone.ports);
    await runSync(tablet.ports);
    expect(tablet.outbox.has(captured.id)).toBe(false);
  });

  test('pushes nothing on a second run when nothing changed', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);

    await runSync(phone.ports);
    const second = await runSync(phone.ports);

    expect(second).toEqual({ pushed: 0, pulled: 0, isForeignDevice: false });
  });

  test('sends a long history in batches the cloud accepts', async () => {
    const cloud = createCloud();
    const batchSizes: number[] = [];
    const push = cloud.port.push;
    cloud.port.push = async (changes) => {
      batchSizes.push(changes.transactions?.length ?? 0);
      return push(changes);
    };
    const history = Array.from({ length: 1_201 }, (_, index) => manual(`manual-${index}`));
    const phone = createDevice(cloud, history);

    const result = await runSync(phone.ports);

    expect(batchSizes).toEqual([500, 500, 201]);
    expect(result.pushed).toBe(1_201);
    expect(cloud.stored.size).toBe(1_201);
  });

  test('keeps a change the cloud would refuse on this device without blocking the others', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [
      manual('manual-lunch'),
      manual('manual-long', { merchant: 'x'.repeat(201) }),
      manual('manual-free', { amountMinor: 0 }),
    ]);

    const result = await runSync(phone.ports);
    const second = await runSync(phone.ports);

    expect([...cloud.stored.keys()]).toEqual(['manual-lunch']);
    expect(result.pushed).toBe(1);
    expect(second.pushed).toBe(0);
    expect(phone.outbox.has('manual-long')).toBe(true);
  });

  test('keeps an offline entry durable and pushes it once connectivity returns', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);

    cloud.goOffline();
    await expect(runSync(phone.ports)).rejects.toThrow('offline');
    cloud.goOnline();
    const result = await runSync(phone.ports);

    expect(result.pushed).toBe(1);
    expect(cloud.stored.get('manual-lunch')).toMatchObject({ amountMinor: 3450 });
  });

  test('does not mark a change as sent when the push fails', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    const push = cloud.port.push;
    cloud.port.push = async () => {
      throw new Error('network');
    };

    await expect(runSync(phone.ports)).rejects.toThrow('network');
    cloud.port.push = push;
    const retry = await runSync(phone.ports);

    expect(retry.pushed).toBe(1);
  });

  test('carries a removal to the other device', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    const tablet = createDevice(cloud);
    await runSync(phone.ports);
    await runSync(tablet.ports);

    phone.outbox.delete('manual-lunch');
    await runSync(phone.ports);
    await runSync(tablet.ports);

    expect(tablet.outbox.has('manual-lunch')).toBe(false);
  });

  test('carries an edit to the other device', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    const tablet = createDevice(cloud);
    await runSync(phone.ports);
    await runSync(tablet.ports);

    tablet.outbox.set('manual-lunch', manual('manual-lunch', { merchant: 'Bistro' }));
    await runSync(tablet.ports);
    await runSync(phone.ports);

    expect(phone.outbox.get('manual-lunch')?.merchant).toBe('Bistro');
  });

  test('treats an unreadable ledger as a device it cannot vouch for', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    await runSync(phone.ports);

    phone.ledger.value = '{not json';
    phone.outbox.set('manual-later', manual('manual-later'));
    const result = await runSync(phone.ports);

    expect(result).toEqual({ pushed: 0, pulled: 0, isForeignDevice: true });
    expect(await claimDevice(phone.ports.ledger, 'user_alice')).toBe(false);
    expect(cloud.stored.size).toBe(1);
  });

  test('treats a ledger that cannot be read at all the same way', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    phone.ports.ledger = {
      read: async () => {
        throw new Error('locked');
      },
      write: async () => undefined,
    };

    expect(await claimDevice(phone.ports.ledger, 'user_alice')).toBe(false);
    expect((await runSync(phone.ports)).isForeignDevice).toBe(true);
  });

  test('refuses to carry the transactions of one user into the cloud of another', async () => {
    const aliceCloud = createCloud();
    const bobCloud = createCloud();
    const phone = createDevice(aliceCloud, [manual('manual-lunch')]);
    await runSync(phone.ports);

    phone.outbox.set('manual-offline', manual('manual-offline'));
    const bobSession = { ...phone.ports, ownerId: 'user_bob', cloud: bobCloud.port };
    const result = await runSync(bobSession);

    expect(result).toEqual({ pushed: 0, pulled: 0, isForeignDevice: true });
    expect(bobCloud.stored.size).toBe(0);
  });

  test('claims a fresh device for the first user who signs in, before any connection', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud);

    expect(await claimDevice(phone.ports.ledger, 'user_alice')).toBe(true);
    phone.outbox.set('manual-offline', manual('manual-offline'));
    expect(await claimDevice(phone.ports.ledger, 'user_bob')).toBe(false);

    const bobSession = { ...phone.ports, ownerId: 'user_bob' };
    expect((await runSync(bobSession)).isForeignDevice).toBe(true);
    expect(cloud.stored.size).toBe(0);
  });

  test('brings an account added on one device to another, together with its transaction', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-rent', { accountId: 'account-shared' })]);
    const tablet = createDevice(cloud);
    phone.accounts.set('account-shared', {
      id: 'account-shared',
      bank: 'manual',
      name: 'Wspólne',
      isGeneral: false,
    });

    await runSync(phone.ports);
    await runSync(tablet.ports);

    expect(tablet.accounts.get('account-shared')?.name).toBe('Wspólne');
    expect(tablet.outbox.get('manual-rent')?.accountId).toBe('account-shared');
  });

  test('does not read its own changes back from the cloud', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);

    await runSync(phone.ports);
    await runSync(phone.ports);

    expect(cloud.pulls).toEqual([0, 0]);
  });

  test('reads only what another device changed since the last run', async () => {
    const cloud = createCloud();
    const history = Array.from({ length: 30 }, (_, index) => manual(`manual-${index}`));
    const phone = createDevice(cloud, history);
    const tablet = createDevice(cloud);
    await runSync(phone.ports);
    await runSync(tablet.ports);

    phone.outbox.set('manual-new', manual('manual-new'));
    await runSync(phone.ports);
    await runSync(tablet.ports);

    expect(cloud.pulls.at(-1)).toBe(1);
    expect(tablet.outbox.has('manual-new')).toBe(true);
  });

  test('pages through a history longer than one pull', async () => {
    const cloud = createCloud();
    const history = Array.from({ length: 1_201 }, (_, index) => manual(`manual-${index}`));
    const phone = createDevice(cloud, history);
    const tablet = createDevice(cloud);

    await runSync(phone.ports);
    await runSync(tablet.ports);

    expect(tablet.outbox.size).toBe(1_201);
  });

  test('sends a removal without the removed content', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    await runSync(phone.ports);

    phone.outbox.delete('manual-lunch');
    await runSync(phone.ports);

    expect(cloud.stored.get('manual-lunch')).toEqual({
      clientId: 'manual-lunch',
      revision: expect.any(Number),
      deleted: true,
      sequence: 2,
    });
  });

  test('reconciles a ledger written before cursors without pushing duplicates', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    await runSync(phone.ports);
    const stored = JSON.parse(phone.ledger.value!);
    delete stored.cursor;
    phone.ledger.value = JSON.stringify(stored);

    const result = await runSync(phone.ports);

    expect(result).toEqual({ pushed: 0, pulled: 0, isForeignDevice: false });
    expect(JSON.parse(phone.ledger.value!).cursor).toBe(1);
  });
});
