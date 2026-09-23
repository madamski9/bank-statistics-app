import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import type { AlertMessage } from './alert-message';
import type { AlertRule } from './alert-rule';
import { runAlerts, type AlertNotifier } from './alert-runner';

const reference = new Date(2026, 8, 22, 17, 44);

function record(amountMinor: number, merchant = 'Żabka'): IngestionRecord {
  return {
    id: `record-${amountMinor}-${merchant}`,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor,
    currency: 'PLN',
    merchant,
    occurredAt: new Date(2026, 8, 20, 10, 0).toISOString(),
    capturedAt: new Date(2026, 8, 20, 10, 0).toISOString(),
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'posted',
    origin: 'capture',
  };
}

function rule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: 'rule-1',
    metric: 'expense',
    scope: { kind: 'merchant', key: 'żabka', name: 'Żabka' },
    period: { kind: 'month' },
    condition: 'threshold',
    targetMinor: 50_000,
    thresholdShares: [0.8, 1],
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function notifier(isAllowed = true) {
  const presented: AlertMessage[] = [];

  return {
    presented,
    notifier: {
      ensurePermission: () => Promise.resolve(isAllowed),
      present: (message: AlertMessage) => {
        presented.push(message);

        return Promise.resolve();
      },
    } satisfies AlertNotifier,
  };
}

describe('runAlerts', () => {
  test('sends one neutral notification for each threshold reached', async () => {
    const sink = notifier();
    const sent = await runAlerts([rule()], [record(41_000)], {
      reference,
      rules: [],
      sent: [],
      notifier: sink.notifier,
    });

    expect(sink.presented).toHaveLength(1);
    expect(sink.presented[0].title).toBe('Blisko limitu w Żabka');
    expect(sent).toHaveLength(1);
  });

  test('says nothing the second time the same threshold is still crossed', async () => {
    const sink = notifier();
    const alreadySent = await runAlerts([rule()], [record(41_000)], {
      reference,
      rules: [],
      sent: [],
      notifier: sink.notifier,
    });

    const sent = await runAlerts([rule()], [record(41_000)], {
      reference,
      rules: [],
      sent: alreadySent,
      notifier: sink.notifier,
    });

    expect(sink.presented).toHaveLength(1);
    expect(sent).toEqual(alreadySent);
  });

  test('one large purchase gives one notification and records both crossed thresholds', async () => {
    const sink = notifier();
    const sent = await runAlerts([rule()], [record(60_000)], {
      reference,
      rules: [],
      sent: [],
      notifier: sink.notifier,
    });

    expect(sink.presented).toHaveLength(1);
    expect(sink.presented[0].title).toBe('Limit w Żabka osiągnięty');
    expect(sent).toHaveLength(2);
  });

  test('a changed limit can notify again within the same month', async () => {
    const sink = notifier();
    const first = await runAlerts([rule()], [record(41_000)], {
      reference,
      rules: [],
      sent: [],
      notifier: sink.notifier,
    });
    const sent = await runAlerts([rule({ targetMinor: 60_000 })], [record(50_000)], {
      reference,
      rules: [],
      sent: first,
      notifier: sink.notifier,
    });

    expect(sink.presented).toHaveLength(2);
    expect(sent).toHaveLength(2);
  });

  test('keeps the ledger untouched when the device refuses notifications', async () => {
    const sink = notifier(false);
    const sent = await runAlerts([rule()], [record(60_000)], {
      reference,
      rules: [],
      sent: [],
      notifier: sink.notifier,
    });

    expect(sink.presented).toEqual([]);
    expect(sent).toEqual([]);
  });

  test('ignores a rule the user switched off', async () => {
    const sink = notifier();
    const sent = await runAlerts([rule({ isActive: false })], [record(60_000)], {
      reference,
      rules: [],
      sent: [],
      notifier: sink.notifier,
    });

    expect(sink.presented).toEqual([]);
    expect(sent).toEqual([]);
  });

  test('survives a delivery that fails without losing the rest', async () => {
    const presented: AlertMessage[] = [];
    let attempt = 0;
    const failing: AlertNotifier = {
      ensurePermission: () => Promise.resolve(true),
      present: (message) => {
        attempt += 1;

        if (attempt === 1) {
          return Promise.reject(new Error('notification centre unavailable'));
        }

        presented.push(message);

        return Promise.resolve();
      },
    };

    const sent = await runAlerts([rule(), rule({ id: 'rule-2' })], [record(60_000)], {
      reference,
      rules: [],
      sent: [],
      notifier: failing,
    });

    expect(presented).toHaveLength(1);
    expect(sent).toHaveLength(2);
  });
});
