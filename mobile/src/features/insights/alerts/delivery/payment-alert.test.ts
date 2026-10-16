import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { formatAmount } from '@/features/app-shell/formatting/formatting';
import { setCurrentLanguage } from '@/features/app-shell/localization/language';
import { classifyTransaction } from '@/features/data/classification/classify-transaction';

import type { AlertRule } from '../rules/alert-rule';
import { paymentSentKey, runAlerts } from './alert-runner';
import type { AlertMessage } from './alert-message';
import { paymentAlertMessage, paymentAlertMessages, paymentAlertTier } from './payment-alert';

setCurrentLanguage('pl');

const reference = new Date(2026, 8, 22, 17, 44);

function payment(id: string, amountMinor: number, overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor,
    currency: 'PLN',
    merchant: 'Żabka',
    occurredAt: new Date(2026, 8, 20, 10, 0).toISOString(),
    capturedAt: new Date(2026, 8, 20, 10, 0).toISOString(),
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'posted',
    origin: 'capture',
    ...overrides,
  };
}

function shopLimit(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: 'rule-1',
    metric: 'expense',
    scope: { kind: 'merchant', key: 'żabka', name: 'Żabka' },
    period: { kind: 'month' },
    condition: 'threshold',
    targetMinor: 10_000,
    thresholdShares: [0.5, 0.8, 0.9, 1],
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function otherShopLimit(merchant: string, overrides: Partial<AlertRule> = {}): AlertRule {
  const key = classifyTransaction(payment('key', 1, { merchant }), []).merchantKey ?? '';

  return shopLimit({ scope: { kind: 'merchant', key, name: merchant }, ...overrides });
}

describe('paymentAlertTier', () => {
  test('steps up at half, 80%, 90% and the full limit', () => {
    expect([0, 0.49, 0.5, 0.79, 0.8, 0.89, 0.9, 0.99, 1, 2.5].map(paymentAlertTier)).toEqual([
      'under',
      'under',
      'half',
      'half',
      'most',
      'most',
      'last',
      'last',
      'over',
      'over',
    ]);
  });
});

describe('paymentAlertMessage', () => {
  test('warns about every payment at a shop with a limit, even far below it', () => {
    const record = payment('a', 1_000);
    const message = paymentAlertMessage(shopLimit({ tone: 'passive' }), record, [record], {
      reference,
      rules: [],
    });

    expect(message?.title).toContain('Żabka');
    expect(message?.body).toContain('90,00');
  });

  test('gets harsher as the limit fills up', () => {
    const tiers = [4_000, 6_000, 8_500, 9_500, 12_000].map((amount) => {
      const record = payment(`p-${amount}`, amount, { merchant: 'Rossmann' });

      return paymentAlertMessage(otherShopLimit('Rossmann', { tone: 'passive' }), record, [record], {
        reference,
        rules: [],
      })?.title;
    });

    expect(tiers).toEqual([
      `${formatAmount(4_000, 'PLN')} w Rossmann`,
      'Połowa limitu w Rossmann',
      '80% limitu w Rossmann',
      '90% limitu w Rossmann',
      'Limit w Rossmann przekroczony',
    ]);
  });

  test('talks about food at a place to eat out', () => {
    const record = payment('food', 8_500, { merchant: 'KFC' });
    const message = paymentAlertMessage(otherShopLimit('KFC', { tone: 'passive' }), record, [record], {
      reference,
      rules: [],
    });

    expect(message?.title).toBe('80% limitu na jedzenie');
  });

  test('treats a grocery shop like any other shop', () => {
    const record = payment('groceries', 8_500);
    const message = paymentAlertMessage(shopLimit({ tone: 'passive' }), record, [record], { reference, rules: [] });

    expect(message?.title).toBe('80% limitu w Żabka');
  });

  test('keeps every notification short enough for the lock screen', () => {
    const tones = ['passive', 'mild', 'aggressive'] as const;
    const shops = ['Żabka', 'Rossmann'];
    const bodies = shops.flatMap((shop) =>
      tones.flatMap((tone) =>
        Array.from({ length: 40 }, (_, index) => {
          const record = payment(`len-${shop}-${tone}-${index}`, 1_000 + index * 300, { merchant: shop });
          const limit = shop === 'Żabka' ? shopLimit({ tone }) : otherShopLimit(shop, { tone });

          const body =
            paymentAlertMessage(limit, record, [record], { reference, rules: [], hasAggressiveTone: true })?.body ?? '';

          expect(body).toContain(shop);
          expect(body).toMatch(/do limitu zostało|ponad limit/);

          return body;
        }),
      ),
    );

    for (const body of bodies) {
      expect(body.split(/[.!?…]+\s/u).length).toBeLessThanOrEqual(2);
      expect(body.length).toBeLessThanOrEqual(110);
    }
  });

  test('stays quiet when the user switched notifications off', () => {
    const record = payment('silent', 12_000);

    expect(paymentAlertMessage(shopLimit({ thresholdShares: [] }), record, [record], { reference, rules: [] })).toBeNull();
  });

  test('swears when the user picked the aggressive tone', () => {
    const record = payment('over', 12_000);
    const message = paymentAlertMessage(shopLimit({ tone: 'aggressive' }), record, [record], {
      reference,
      rules: [],
      hasAggressiveTone: true,
    });

    expect(`${message?.title} ${message?.body}`.toLocaleLowerCase('pl')).toMatch(/k\*\*wa|ch\*j|popie\*\*\*liło/);
  });

  test('falls back to the milder tone without Premium', () => {
    const record = payment('lapsed', 12_000);
    const aggressive = shopLimit({ tone: 'aggressive' });
    const withoutPremium = paymentAlertMessage(aggressive, record, [record], { reference, rules: [] });
    const mild = paymentAlertMessage(shopLimit({ tone: 'mild' }), record, [record], { reference, rules: [] });

    expect(withoutPremium).toEqual(mild);
  });

  test('picks the same wording for the same payment every time', () => {
    const record = payment('stable', 3_000);
    const first = paymentAlertMessage(shopLimit({ tone: 'aggressive' }), record, [record], { reference, rules: [] });
    const second = paymentAlertMessage(shopLimit({ tone: 'aggressive' }), record, [record], { reference, rules: [] });

    expect(first).toEqual(second);
  });

  test('stays quiet for other shops, income, other currencies and other kinds of limits', () => {
    const elsewhere = payment('b', 1_000, { merchant: 'Lidl' });
    const income = payment('c', 1_000, { direction: 'income' });
    const euro = payment('d', 1_000, { currency: 'EUR' });
    const context = { reference, rules: [] };

    expect(paymentAlertMessage(shopLimit(), elsewhere, [elsewhere], context)).toBeNull();
    expect(paymentAlertMessage(shopLimit(), income, [income], context)).toBeNull();
    expect(paymentAlertMessage(shopLimit(), euro, [euro], context)).toBeNull();
    expect(paymentAlertMessage(shopLimit({ scope: { kind: 'all' } }), payment('e', 1_000), [], context)).toBeNull();
    expect(paymentAlertMessage(shopLimit({ isActive: false }), payment('f', 1_000), [], context)).toBeNull();
  });

  test('gives one message per matching limit', () => {
    const record = payment('g', 1_000);

    expect(
      paymentAlertMessages([shopLimit(), shopLimit({ id: 'rule-2', scope: { kind: 'all' } })], record, [record], {
        reference,
        rules: [],
      }),
    ).toHaveLength(1);
  });
});

describe('runAlerts for shop limits', () => {
  function sink() {
    const presented: AlertMessage[] = [];

    return {
      presented,
      notifier: {
        ensurePermission: () => Promise.resolve(true),
        present: (message: AlertMessage) => {
          presented.push(message);

          return Promise.resolve();
        },
      },
    };
  }

  test('leaves captured payments to the background capture', async () => {
    const target = sink();
    const sent = await runAlerts([shopLimit()], [payment('h', 12_000)], {
      reference,
      rules: [],
      sent: [],
      notifier: target.notifier,
    });

    expect(target.presented).toEqual([]);
    expect(sent).toEqual([]);
  });

  test('warns once about a payment added by hand', async () => {
    const manual = payment('i', 2_000, { origin: 'manual', capturedAt: new Date(2026, 8, 22, 17, 0).toISOString() });
    const target = sink();
    const first = await runAlerts([shopLimit()], [manual], {
      reference,
      rules: [],
      sent: [],
      notifier: target.notifier,
    });
    const second = await runAlerts([shopLimit()], [manual], {
      reference,
      rules: [],
      sent: first,
      notifier: target.notifier,
    });

    expect(target.presented).toHaveLength(1);
    expect(second).toEqual([paymentSentKey('rule-1', 'i')]);
  });

  test('does not replay old manual payments from before the limit or the last day', async () => {
    const beforeLimit = payment('j', 2_000, { origin: 'manual', capturedAt: '2026-08-30T10:00:00.000Z' });
    const stale = payment('k', 2_000, { origin: 'manual', capturedAt: new Date(2026, 8, 20, 10, 0).toISOString() });
    const target = sink();

    await runAlerts([shopLimit()], [beforeLimit, stale], { reference, rules: [], sent: [], notifier: target.notifier });

    expect(target.presented).toEqual([]);
  });
});
