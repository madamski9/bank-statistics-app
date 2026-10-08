import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import {
  historyCount,
  ignoreCandidates,
  ignoreTargetFor,
  isIgnoreRule,
  isIgnored,
  matchesCandidateQuery,
  ruleFor,
  withIgnoreRule,
  withoutIgnoreRule,
} from './ignore-rule';

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: 'record-1',
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1234,
    currency: 'PLN',
    merchant: 'ZABKA Z7423 WARSZAWA',
    occurredAt: '2026-09-20T10:15:00.000Z',
    capturedAt: '2026-09-20T10:15:00.000Z',
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'posted',
    origin: 'capture',
    ...overrides,
  };
}

const outgoing = record({
  transactionType: 'outgoingTransfer',
  merchant: 'Jan Kowalski',
});

const incoming = record({
  direction: 'income',
  transactionType: 'incomingTransfer',
  merchant: 'Jan Kowalski',
});

describe('ignoreTargetFor', () => {
  test('treats a card payment as a payment at the shop', () => {
    expect(ignoreTargetFor(record({ merchant: 'Netflix' }))).toEqual({ kind: 'payment', name: 'Netflix' });
  });

  test('tells outgoing and incoming transfers apart', () => {
    expect(ignoreTargetFor(outgoing)?.kind).toBe('outgoingTransfer');
    expect(ignoreTargetFor(incoming)?.kind).toBe('incomingTransfer');
  });

  test('offers nothing for manual entries or nameless notifications', () => {
    expect(ignoreTargetFor(record({ origin: 'manual' }))).toBeNull();
    expect(ignoreTargetFor(record({ merchant: undefined }))).toBeNull();
  });

  test('offers nothing for a refund from a shop', () => {
    expect(
      ignoreTargetFor(record({ direction: 'income', transactionType: 'refund', merchant: 'Zalando' })),
    ).toBeNull();
  });
});

describe('isIgnored', () => {
  test('skips transfers from a person only in the chosen direction', () => {
    const rules = [{ kind: 'incomingTransfer' as const, name: 'Jan Kowalski' }];

    expect(isIgnored(incoming, rules)).toBe(true);
    expect(isIgnored(outgoing, rules)).toBe(false);
  });

  test('matches regardless of letter case and Polish characters', () => {
    expect(
      isIgnored(record({ transactionType: 'outgoingTransfer', merchant: 'JAN KOWALSKI' }), [
        { kind: 'outgoingTransfer', name: 'jan kowalski' },
      ]),
    ).toBe(true);
    expect(
      isIgnored(record({ transactionType: 'outgoingTransfer', merchant: 'Paweł Żółć' }), [
        { kind: 'outgoingTransfer', name: 'pawel zolc' },
      ]),
    ).toBe(true);
  });

  test('matches a typed shop name inside a longer label', () => {
    const rules = [{ kind: 'payment' as const, name: 'Żabka', match: 'contains' as const }];

    expect(isIgnored(record(), rules)).toBe(true);
    expect(isIgnored(record({ merchant: 'ZABKOWO SKLEP' }), rules)).toBe(false);
  });

  test('skips only the exact person or shop picked from the history', () => {
    const anna = record({ transactionType: 'outgoingTransfer', merchant: 'Anna Nowak' });
    const annaKowalska = record({ transactionType: 'outgoingTransfer', merchant: 'Anna Nowak-Kowalska' });
    const latto = record({ merchant: 'Latto' });
    const lattoGelato = record({ merchant: 'Latto Gelato' });
    const picked = [
      { kind: 'outgoingTransfer' as const, name: 'Anna Nowak' },
      { kind: 'payment' as const, name: 'Latto' },
    ];

    expect(isIgnored(anna, picked)).toBe(true);
    expect(isIgnored(annaKowalska, picked)).toBe(false);
    expect(isIgnored(latto, picked)).toBe(true);
    expect(isIgnored(lattoGelato, picked)).toBe(false);
    expect(historyCount([anna, annaKowalska], { kind: 'outgoingTransfer', name: 'Anna Nowak' })).toBe(1);
    expect(
      historyCount([anna, annaKowalska], { kind: 'outgoingTransfer', name: 'Anna Nowak' }, 'contains'),
    ).toBe(2);
  });

  test('keeps the history when skipping starts from a given moment', () => {
    const rules = [{ kind: 'payment' as const, name: 'Zabka', since: '2026-10-08T12:00:00.000Z' }];

    expect(isIgnored(record({ occurredAt: '2026-10-08T11:59:00.000Z' }), rules)).toBe(false);
    expect(isIgnored(record({ occurredAt: '2026-10-08T12:30:00.000Z' }), rules)).toBe(true);
  });

  test('never hides manual entries', () => {
    expect(isIgnored(record({ origin: 'manual' }), [{ kind: 'payment', name: 'Zabka' }])).toBe(false);
  });
});

describe('ignoreCandidates', () => {
  const history = [
    record({ id: 'a', amountMinor: 1000, occurredAt: '2026-09-01T10:00:00.000Z' }),
    record({ id: 'b', amountMinor: 2000, occurredAt: '2026-09-15T10:00:00.000Z' }),
    { ...outgoing, id: 'c', occurredAt: '2026-09-10T10:00:00.000Z' },
    record({ id: 'd', currency: 'EUR', merchant: 'Lidl', occurredAt: '2026-09-05T10:00:00.000Z' }),
    record({ id: 'e', origin: 'manual', merchant: 'Kiosk' }),
  ];

  test('groups the history by shop or person with the newest first', () => {
    const candidates = ignoreCandidates(history, []);

    expect(candidates.map((candidate) => candidate.name)).toEqual(['Żabka', 'Jan Kowalski', 'Lidl']);
    expect(candidates[0]).toMatchObject({ kind: 'payment', count: 2, totalMinor: 3000 });
  });

  test('leaves out what is already skipped', () => {
    const candidates = ignoreCandidates(history, [{ kind: 'outgoingTransfer', name: 'jan kowalski' }]);

    expect(candidates.map((candidate) => candidate.name)).toEqual(['Żabka', 'Lidl']);
  });

  test('searches without caring about Polish characters', () => {
    const [zabka] = ignoreCandidates(history, []);

    expect(matchesCandidateQuery(zabka, 'żab')).toBe(true);
    expect(matchesCandidateQuery(zabka, 'lidl')).toBe(false);
    expect(matchesCandidateQuery(zabka, '  ')).toBe(true);
  });

  test('counts the transactions a full removal would delete', () => {
    expect(historyCount(history, { kind: 'payment', name: 'Zabka' })).toBe(2);
  });
});

describe('rule list', () => {
  test('keeps one rule per name and kind', () => {
    const once = withIgnoreRule([], { kind: 'payment', name: ' Netflix ' });
    const twice = withIgnoreRule(once, { kind: 'payment', name: 'NETFLIX', since: '2026-10-08T12:00:00.000Z' });

    expect(twice).toEqual([{ kind: 'payment', name: 'NETFLIX', since: '2026-10-08T12:00:00.000Z' }]);
  });

  test('ignores blank names', () => {
    expect(withIgnoreRule([], { kind: 'payment', name: '  ' })).toEqual([]);
  });

  test('finds and removes a rule', () => {
    const rules = withIgnoreRule([], { kind: 'outgoingTransfer', name: 'Jan Kowalski' });

    expect(ruleFor(rules, { kind: 'outgoingTransfer', name: 'JAN KOWALSKI' })).not.toBeNull();
    expect(withoutIgnoreRule(rules, { kind: 'outgoingTransfer', name: 'jan kowalski' })).toEqual([]);
  });

  test('validates stored rules', () => {
    expect(isIgnoreRule({ kind: 'payment', name: 'Netflix' })).toBe(true);
    expect(isIgnoreRule({ kind: 'payment', name: 'Netflix', since: '2026-10-08T12:00:00.000Z' })).toBe(true);
    expect(isIgnoreRule({ kind: 'payment', name: 'Netflix', since: 'soon' })).toBe(false);
    expect(isIgnoreRule({ kind: 'payment', name: 'Netflix', match: 'contains' })).toBe(true);
    expect(isIgnoreRule({ kind: 'payment', name: 'Netflix', match: 'prefix' })).toBe(false);
    expect(isIgnoreRule({ kind: 'fee', name: 'Netflix' })).toBe(false);
    expect(isIgnoreRule({ kind: 'payment', name: '' })).toBe(false);
  });
});
