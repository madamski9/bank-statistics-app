import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import type { PushedChange, RemoteTransaction } from './sync-plan';
import { runSync, type SyncPorts } from './sync-runner';

function manual(id: string, overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id,
    bank: 'manual',
    direction: 'expense',
    amountMinor: 3450,
    currency: 'PLN',
    occurredAt: '2026-09-20T12:30:00.000Z',
    capturedAt: '2026-09-20T12:31:00.000Z',
    sourceApp: 'manual',
    status: 'posted',
    origin: 'manual',
    ...overrides,
  };
}

function createCloud() {
  const stored = new Map<string, RemoteTransaction>();
  let isOnline = true;

  return {
    stored,
    goOffline: () => {
      isOnline = false;
    },
    goOnline: () => {
      isOnline = true;
    },
    port: {
      list: async () => {
        if (!isOnline) {
          throw new Error('offline');
        }

        return [...stored.values()];
      },
      push: async (changes: PushedChange[]) => {
        if (!isOnline) {
          throw new Error('offline');
        }

        for (const change of changes) {
          const existing = stored.get(change.clientId);

          if (existing === undefined || change.revision > existing.revision) {
            stored.set(change.clientId, change);
          }
        }
      },
    },
  };
}

function createDevice(cloud: ReturnType<typeof createCloud>, records: IngestionRecord[] = []) {
  const outbox = new Map(records.map((record) => [record.id, record]));
  const ledger: { value: string | null } = { value: null };
  let clock = 1_800_000_000_000;

  const ports: SyncPorts = {
    outbox: {
      list: async () => [...outbox.values()],
      save: async (record) => {
        outbox.set(record.id, record);
      },
      remove: async (id) => {
        outbox.delete(id);
      },
    },
    cloud: cloud.port,
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

  return { outbox, ledger, ports };
}

describe('runSync', () => {
  test('brings a manual transaction from one device to another', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    const tablet = createDevice(cloud);

    await runSync(phone.ports);
    await runSync(tablet.ports);

    expect(tablet.outbox.get('manual-lunch')).toEqual(manual('manual-lunch'));
  });

  test('pushes nothing on a second run when nothing changed', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);

    await runSync(phone.ports);
    const second = await runSync(phone.ports);

    expect(second).toEqual({ pushed: 0, pulled: 0 });
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
    const push = cloud.port.push;
    phone.ports.cloud = {
      list: cloud.port.list,
      push: async () => {
        throw new Error('network');
      },
    };

    await expect(runSync(phone.ports)).rejects.toThrow('network');
    phone.ports.cloud = { list: cloud.port.list, push };
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

  test('starts over from an unreadable ledger without duplicating anything', async () => {
    const cloud = createCloud();
    const phone = createDevice(cloud, [manual('manual-lunch')]);
    await runSync(phone.ports);

    phone.ledger.value = '{not json';
    const result = await runSync(phone.ports);

    expect(result).toEqual({ pushed: 0, pulled: 0 });
    expect(cloud.stored.size).toBe(1);
  });
});
