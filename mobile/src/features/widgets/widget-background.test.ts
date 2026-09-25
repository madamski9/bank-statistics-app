import type { IngestionRecord } from '@bankstats/ingestion-native';
import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import { buildWidgetCalculator } from './build-calculator.cjs';
import { snapshot, timeline, type WidgetBackgroundConfiguration } from './widget-background';

const reference = new Date(2026, 8, 25, 12).getTime();
const configuration: WidgetBackgroundConfiguration = {
  enabled: true,
  openUrl: 'bankstats-dev:///',
  categorizationRules: [{ merchantKey: 'żabka', merchantName: 'Żabka', category: 'groceries', scope: 'private' }],
  alertRules: [{
    id: 'groceries',
    scope: { kind: 'category', id: 'groceries' },
    metric: 'expense',
    condition: 'threshold',
    period: { kind: 'month' },
    targetMinor: 20_000,
    thresholdShares: [0.8, 1],
    isActive: true,
    createdAt: new Date(reference).toISOString(),
  }],
};

function record(id: string, amountMinor = 10_000): IngestionRecord {
  return {
    id,
    amountMinor,
    bank: 'millennium',
    direction: 'expense',
    currency: 'PLN',
    merchant: 'Żabka',
    transactionType: 'cardPayment',
    occurredAt: new Date(reference - 1000).toISOString(),
    capturedAt: new Date(reference).toISOString(),
    sourceApp: 'com.apple.Passbook',
    status: 'posted',
    origin: 'capture',
  };
}

const directory = mkdtempSync(path.join(tmpdir(), 'bankstats-widget-test-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe('background widget snapshots', () => {
  test('recalculates amounts, category limits and shops after captures and edits', () => {
    const first = record('first');
    const second = record('second', 8_000);
    const initial = snapshot(configuration, [first], reference);
    const captured = snapshot(configuration, [first, second], reference);
    const corrected = snapshot(configuration, [first, { ...second, amountMinor: 2_000 }], reference);
    const deleted = snapshot(configuration, [first], reference);

    expect(initial.expenseLabel).toBe('100 zł');
    expect(captured.expenseLabel).toBe('180 zł');
    expect(captured.limits[0].tone).toBe('caution');
    expect(captured.limits[0].remainingAmountLabel).toBe('20 zł');
    expect(captured.shops[0].amountLabel).toBe('180 zł');
    expect(corrected.expenseLabel).toBe('120 zł');
    expect(corrected.limits[0].tone).toBe('calm');
    expect(deleted).toEqual(initial);
  });

  test('excludes synthetic captures, reversals and unresolved amounts', () => {
    const props = snapshot(configuration, [
      record('real'),
      { ...record('synthetic'), merchant: 'SKLEP TEST' },
      { ...record('reversed'), status: 'reversed' },
      { ...record('review'), review: 'amount' },
    ], reference);

    expect(props.expenseLabel).toBe('100 zł');
    expect(props.countLabel).toBe('1 płatność');
  });

  test('uses the new month when a transaction arrives after midnight', () => {
    const nextMonth = new Date(2026, 9, 1, 0, 1).getTime();
    const props = snapshot(configuration, [record('old'), {
      ...record('new', 3_000),
      occurredAt: new Date(nextMonth - 1000).toISOString(),
    }], nextMonth);

    expect(props.monthKey).toBe('2026-10');
    expect(props.expenseLabel).toBe('30 zł');
    expect(props.limits[0].spentLabel).toBe('30 zł');
  });

  test('keeps captures private while signed out', () => {
    const props = snapshot({ ...configuration, enabled: false }, [record('private')], reference);

    expect(props.status).toBe('signedOut');
    expect(props.expenseLabel).toBe('');
    expect(props.limits).toEqual([]);
    expect(props.shops).toEqual([]);
  });

  test('keeps background captures blurred and preserves the reveal deadline', () => {
    const until = reference + 5 * 60_000;
    const hiddenConfiguration = {
      ...configuration,
      revealUrl: 'bankstats-dev:///?widget=reveal',
      privacy: { isBlurred: true, revealedUntilMs: 0 },
    };
    const [hidden] = timeline(hiddenConfiguration, [record('new')], reference);
    expect(hidden.props.isBlurred).toBe(true);
    expect(hidden.props.revealUrl).toBe(hiddenConfiguration.revealUrl);

    const revealedConfiguration = {
      ...hiddenConfiguration,
      privacy: { isBlurred: true, revealedUntilMs: until },
    };
    const entries = timeline(revealedConfiguration, [record('new')], reference);
    expect(entries.map((entry) => entry.props.isBlurred)).toEqual([false, true]);
    expect(entries[1].timestamp).toBe(until);
    const expired = timeline(revealedConfiguration, [record('new')], until);
    expect(expired).toHaveLength(1);
    expect(expired[0].props.isBlurred).toBe(true);
  });

  test('the standalone native calculator runs without React Native and matches the app', () => {
    const outfile = path.join(directory, 'calculator.js');
    buildWidgetCalculator(outfile);
    const context = {} as { BankStatsWidgetCalculator: { snapshot: typeof snapshot; timeline: typeof timeline } };
    runInNewContext(readFileSync(outfile, 'utf8'), context);
    const records = [record('one'), record('two', 8_000)];
    const input = JSON.parse(JSON.stringify(configuration));
    const actual = context.BankStatsWidgetCalculator.snapshot(input, records, reference);

    expect(JSON.parse(JSON.stringify(actual))).toEqual(snapshot(configuration, records, reference));
    const privateInput = {
      ...input,
      privacy: { isBlurred: true, revealedUntilMs: reference + 300_000 },
    };
    expect(context.BankStatsWidgetCalculator.timeline(privateInput, records, reference)).toEqual(
      timeline(privateInput, records, reference),
    );
  });
});
