import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import type { AlertRule } from '@/features/alerts/alert-rule';

import { buildSpendingWidgetProps, signedOutWidgetProps, widgetLimits } from './widget-snapshot';

const reference = new Date(2026, 8, 24, 18, 5);

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: `record-${Math.random()}`,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 10_000,
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

function limit(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: `rule-${Math.random()}`,
    metric: 'expense',
    scope: { kind: 'merchant', key: 'żabka', name: 'Żabka' },
    period: { kind: 'month' },
    condition: 'threshold',
    targetMinor: 20_000,
    thresholdShares: [0.8, 1],
    isActive: true,
    createdAt: reference.toISOString(),
    ...overrides,
  };
}

function build(records: IngestionRecord[], alertRules: AlertRule[] = []) {
  return buildSpendingWidgetProps({
    records,
    alertRules,
    categorizationRules: [],
    reference,
    openUrl: 'bankstats://',
  });
}

describe('buildSpendingWidgetProps', () => {
  test('counts only the calendar month so far', () => {
    const lastMonth = record({ occurredAt: new Date(2026, 7, 31, 12, 0).toISOString() });
    const props = build([record(), record({ amountMinor: 5_000 }), lastMonth]);

    expect(props.status).toBe('ready');
    expect(props.monthKey).toBe('2026-09');
    expect(props.monthLabel).toBe('Wrzesień');
    expect(props.expenseLabel).toBe('150 zł');
    expect(props.countLabel).toBe('2 płatności');
  });

  test('leaves review items and reversed transactions out of the total', () => {
    const props = build([
      record(),
      record({ review: 'currency' }),
      record({ status: 'reversed' }),
    ]);

    expect(props.expenseLabel).toBe('100 zł');
  });

  test('ranks the shops by what was spent there', () => {
    const props = build([
      record({ merchant: 'Lidl', amountMinor: 30_000 }),
      record({ merchant: 'Żabka', amountMinor: 5_000 }),
    ]);

    expect(props.shops.map((shop) => shop.name)).toEqual(['Lidl', 'Żabka']);
    expect(props.shops[0].amountLabel).toBe('300 zł');
  });

  test('keeps the page the user flipped to', () => {
    const props = buildSpendingWidgetProps({
      records: [],
      alertRules: [],
      categorizationRules: [],
      reference,
      openUrl: 'bankstats://',
      step: 3,
    });

    expect(props.step).toBe(3);
  });
});

describe('widgetLimits', () => {
  test('puts the limit closest to its end first and says how much is left', () => {
    const limits = widgetLimits(
      [
        limit({ scope: { kind: 'all' }, targetMinor: 1_000_000 }),
        limit({ targetMinor: 20_000 }),
      ],
      [record({ amountMinor: 17_000 })],
      [],
      reference,
    );

    expect(limits[0].name).toBe('Żabka');
    expect(limits[0].tone).toBe('caution');
    expect(limits[0].remainingLabel).toBe('zostało 30 zł');
    expect(limits[0].daysLeftLabel).toBe('jeszcze 7 dni');
    expect(limits[1].name).toBe('Wszystkie wydatki');
    expect(limits[1].tone).toBe('calm');
  });

  test('says by how much a limit was passed', () => {
    const [passed] = widgetLimits([limit()], [record({ amountMinor: 25_000 })], [], reference);

    expect(passed.tone).toBe('over');
    expect(passed.remainingLabel).toBe('50 zł ponad limit');
  });

  test('ignores paused rules and income alerts', () => {
    const limits = widgetLimits(
      [limit({ isActive: false }), limit({ metric: 'income' }), limit({ condition: 'missingIncome' })],
      [record()],
      [],
      reference,
    );

    expect(limits).toEqual([]);
  });
});

describe('signedOutWidgetProps', () => {
  test('carries no amounts', () => {
    const props = signedOutWidgetProps(reference, 'bankstats://');

    expect(props.status).toBe('signedOut');
    expect(props.expenseLabel).toBe('');
    expect(props.limits).toEqual([]);
    expect(props.shops).toEqual([]);
  });
});
