import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import type { CustomCategory } from '@/features/classification/categories';
import type { SpendingEvent } from '@/features/events/spending-event';
import type { FinancialAccount } from '@/features/financial-accounts/financial-account';

import type { RemoteAccount } from './account-codec';
import type { RemoteCategory } from './category-codec';
import type { RemoteEvent } from './event-codec';
import type { Versioned } from './sync-plan';
import { claimDevice, forgetSyncedState, runSync, type SyncPorts } from './sync-runner';
import type { RemoteTransaction } from './transaction-codec';

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

function createTable<Change extends { clientId: string } & Versioned>(isOnline: () => boolean) {
  const stored = new Map<string, Change>();

  return {
    stored,
    list: async () => {
      if (!isOnline()) {
        throw new Error('offline');
      }

      return [...stored.values()];
    },
    push: async (changes: Change[]) => {
      if (!isOnline()) {
        throw new Error('offline');
      }

      for (const change of changes) {
        const existing = stored.get(change.clientId);

        if (existing === undefined || change.revision > existing.revision) {
          stored.set(change.clientId, change);
        }
      }
    },
  };
}

function createCloud() {
  let online = true;
  const transactions = createTable<RemoteTransaction>(() => online);
  const accounts = createTable<RemoteAccount>(() => online);
  const categories = createTable<RemoteCategory>(() => online);
  const events = createTable<RemoteEvent>(() => online);

  return {
    stored: transactions.stored,
    storedAccounts: accounts.stored,
    goOffline: () => {
      online = false;
    },
    goOnline: () => {
      online = true;
    },
    transactions: { list: transactions.list, push: transactions.push },
    accounts: { list: accounts.list, push: accounts.push },
    categories: { list: categories.list, push: categories.push },
    events: { list: events.list, push: events.push },
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
    transactions: {
      local: {
        list: async () => [...outbox.values()],
        save: async (record) => {
          outbox.set(record.id, record);
        },
        remove: async (id) => {
          outbox.delete(id);
        },
      },
      cloud: cloud.transactions,
    },
    accounts: {
      local: {
        list: async () => [...accounts.values()],
        save: async (account) => {
          accounts.set(account.id, account);
        },
        remove: async (id) => {
          accounts.delete(id);
        },
      },
      cloud: cloud.accounts,
    },
    categories: {
      local: {
        list: async () => [...categories.values()],
        save: async (category) => {
          categories.set(category.id, category);
        },
        remove: async (id) => {
          categories.delete(id);
        },
      },
      cloud: cloud.categories,
    },
    events: {
      local: {
        list: async () => [...events.values()],
        save: async (event) => {
          events.set(event.id, event);
        },
        remove: async (id) => {
          events.delete(id);
        },
      },
      cloud: cloud.events,
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
    cloud.stored.clear();
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

  test('keeps an offline entry durable and pushes it once connectivity returns', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);

    cloud.goOffline();
    await expect(runSync(phone.ports)).rejects.toThrow('offline');
    cloud.goOnline();
    const result = await runSync(phone.ports);

    expect(result.pushed).toBe(1);
    expect(cloud.stored.get('manual-lunch')?.amountMinor).toBe(3450);
  });

  test('does not mark a change as sent when the push fails', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    phone.ports.transactions.cloud = {
      list: cloud.transactions.list,
      push: async () => {
        throw new Error('network');
      },
    };

    await expect(runSync(phone.ports)).rejects.toThrow('network');
    phone.ports.transactions.cloud = cloud.transactions;
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
    const bobSession = {
      ...phone.ports,
      ownerId: 'user_bob',
      transactions: { ...phone.ports.transactions, cloud: bobCloud.transactions },
    };
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
});
