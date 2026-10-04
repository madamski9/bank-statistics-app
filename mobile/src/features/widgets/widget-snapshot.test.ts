import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import type { AlertRule } from '@/features/alerts/alert-rule';
import { expenseRhythm, rhythmAverageMinor } from '@/features/overview/spending-rhythm';
import { formatAmount, formatCompactAmount } from '@/features/spending-overview/formatting';
import { periodWindow } from '@/features/spending-overview/periods';
import { summarizeSpending } from '@/features/spending-overview/spending-summary';

import {
  buildSpendingWidgetProps,
  signedOutWidgetProps,
  widgetEntries,
  widgetLimits,
} from './widget-snapshot';

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
  test('counts the same last 30 days as the overview', () => {
    const endOfLastMonth = record({ occurredAt: new Date(2026, 7, 31, 12, 0).toISOString() });
    const tooOld = record({ occurredAt: new Date(2026, 7, 20, 12, 0).toISOString() });
    const props = build([record(), record({ amountMinor: 5_000 }), endOfLastMonth, tooOld]);

    expect(props.status).toBe('ready');
    expect(props.periodLabel).toBe('30 dni');
    expect(props.expenseLabel).toBe('250,00 zł');
    expect(props.countLabel).toBe('3 płatności');
  });

  test('shows the same spending and daily average as the overview on 1M', () => {
    const records = [
      record({ amountMinor: 12_345 }),
      record({ amountMinor: 6_789, occurredAt: new Date(2026, 8, 2, 9, 0).toISOString() }),
      record({ amountMinor: 50_000, direction: 'income' }),
    ];
    const window = periodWindow('month', reference);
    const summary = summarizeSpending(records, window, []);
    const rhythm = expenseRhythm(records, summary.currency, window, 'month');
    const props = build(records);

    expect(props.expenseLabel).toBe(formatAmount(summary.expenseMinor, summary.currency));
    expect(props.incomeLabel).toBe(formatCompactAmount(summary.incomeMinor, summary.currency));
    expect(props.dailyAmountLabel).toBe(
      formatCompactAmount(rhythmAverageMinor(rhythm.buckets), summary.currency),
    );
  });

  test('leaves review items and reversed transactions out of the total', () => {
    const props = build([
      record(),
      record({ review: 'currency' }),
      record({ status: 'reversed' }),
    ]);

    expect(props.expenseLabel).toBe('100,00 zł');
  });

  test('ranks the shops by what was spent there', () => {
    const props = build([
      record({ merchant: 'Lidl', amountMinor: 30_000 }),
      record({ merchant: 'Żabka', amountMinor: 5_000 }),
    ]);

    expect(props.shops.map((shop) => shop.name)).toEqual(['Lidl', 'Żabka']);
    expect(props.shops[0].amountLabel).toBe('300 zł');
  });

  test('keeps shop totals in the same currency as the monthly amount', () => {
    const props = build([
      record({ amountMinor: 10_000 }),
      record({ amountMinor: 5_000 }),
      record({ amountMinor: 90_000, currency: 'EUR' }),
    ]);

    expect(props.expenseLabel).toBe('150,00 zł');
    expect(props.shops[0].amountLabel).toBe('150 zł');
    expect(props.dailyAmountLabel).toBe('5 zł');
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

describe('widgetEntries', () => {
  const ready = () =>
    buildSpendingWidgetProps({
      records: [record()],
      alertRules: [],
      categorizationRules: [],
      reference,
      openUrl: 'bankstats://',
      revealUrl: 'bankstats://?widget=reveal',
    });

  test('shows the widget plainly unless the user asked to blur it', () => {
    const entries = widgetEntries(() => ready(), { isBlurred: false, revealedUntilMs: 0 }, reference);

    expect(entries).toHaveLength(8);
    expect(entries.every((entry) => !entry.props.isBlurred)).toBe(true);
    expect(entries[0].props.expenseLabel).toBe('100,00 zł');
  });

  test('blurs the widget and points a tap at the reveal link', () => {
    const [entry] = widgetEntries(() => ready(), { isBlurred: true, revealedUntilMs: 0 }, reference);

    expect(entry.props.isBlurred).toBe(true);
    expect(entry.props.revealUrl).toBe('bankstats://?widget=reveal');
  });

  test('reveals a blurred widget until the reveal window ends, then blurs it again', () => {
    const until = reference.getTime() + 5 * 60_000;
    const entries = widgetEntries(() => ready(), { isBlurred: true, revealedUntilMs: until }, reference);

    expect(entries.map((entry) => entry.props.isBlurred).slice(0, 3)).toEqual([false, true, true]);
    expect(entries[1].date.getTime()).toBe(until);
  });

  test('precomputes the next days so the widget stays right without new transactions', () => {
    const oldest = record({ occurredAt: new Date(2026, 7, 26, 12, 0).toISOString() });
    const entries = widgetEntries(
      (moment) =>
        buildSpendingWidgetProps({
          records: [record(), oldest],
          alertRules: [],
          categorizationRules: [],
          reference: moment,
          updatedAt: reference,
          openUrl: 'bankstats://',
        }),
      { isBlurred: false, revealedUntilMs: 0 },
      reference,
    );

    expect(entries[1].date).toEqual(new Date(2026, 8, 25));
    expect(entries[0].props.expenseLabel).toBe('200,00\u00A0zł');
    expect(entries[3].props.expenseLabel).toBe('100,00\u00A0zł');
    expect(entries[3].props.updatedAtMs).toBe(reference.getTime());
  });

  test('never blurs the signed-out message', () => {
    const [entry] = widgetEntries(
      () => signedOutWidgetProps(reference, 'bankstats://'),
      { isBlurred: true, revealedUntilMs: 0 },
      reference,
    );

    expect(entry.props.isBlurred).toBe(false);
  });
});
