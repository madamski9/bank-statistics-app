import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import {
  confirmedRecord,
  draftError,
  draftFromRecord,
  emptyDraft,
  kindForDirection,
  parseAmountMinor,
  parseDraftMoment,
  recordFromDraft,
} from './manual-transaction';

const captured: IngestionRecord = {
  id: 'captured-1',
  bank: 'millennium',
  direction: 'expense',
  transactionType: 'cardPayment',
  amountMinor: 1234,
  currency: 'PLN',
  merchant: 'SKLEP',
  occurredAt: '2026-09-20T10:15:00.000Z',
  capturedAt: '2026-09-20T10:15:00.000Z',
  sourceApp: 'pl.millenniumbank.bankmillennium',
  status: 'pending',
  origin: 'capture',
  review: 'currency',
};

describe('parseAmountMinor', () => {
  test('reads Polish and dotted decimals', () => {
    expect(parseAmountMinor('12,34')).toBe(1234);
    expect(parseAmountMinor('12.3')).toBe(1230);
    expect(parseAmountMinor('1 234')).toBe(123_400);
  });

  test('rejects zero, negatives and text', () => {
    expect(parseAmountMinor('0')).toBeNull();
    expect(parseAmountMinor('-5')).toBeNull();
    expect(parseAmountMinor('dużo')).toBeNull();
  });
});

describe('parseDraftMoment', () => {
  test('reads a local date and time', () => {
    const moment = parseDraftMoment('21.09.2026', '14:05');

    expect(moment?.getFullYear()).toBe(2026);
    expect(moment?.getMonth()).toBe(8);
    expect(moment?.getDate()).toBe(21);
    expect(moment?.getHours()).toBe(14);
    expect(moment?.getMinutes()).toBe(5);
  });

  test('rejects a day the month does not have', () => {
    expect(parseDraftMoment('31.02.2026', '10:00')).toBeNull();
    expect(parseDraftMoment('21/09/2026', '10:00')).toBeNull();
    expect(parseDraftMoment('21.09.2026', '25:00')).toBeNull();
  });
});

describe('draftError', () => {
  test('accepts a complete draft without a name', () => {
    const draft = { ...emptyDraft(new Date(2026, 8, 21, 9, 30)), amount: '20' };

    expect(draftError(draft)).toBeNull();
  });

  test('names the first missing fact', () => {
    const draft = emptyDraft(new Date(2026, 8, 21, 9, 30));

    expect(draftError(draft)).toBe('Podaj kwotę większą od zera.');
    expect(draftError({ ...draft, amount: '20', currency: 'złotówki' })).toBe(
      'Waluta to trzyliterowy kod, na przykład PLN.',
    );
    expect(draftError({ ...draft, amount: '20', date: 'jutro' })).toBe(
      'Podaj datę jako DD.MM.RRRR i godzinę jako GG:MM.',
    );
  });
});

describe('recordFromDraft', () => {
  const now = new Date(2026, 8, 21, 9, 30);

  test('builds a manual transaction that counts as posted', () => {
    const draft = {
      ...emptyDraft(now),
      direction: 'income' as const,
      kind: 'incomingTransfer' as const,
      amount: '250,50',
      name: '  Zwrot podatku  ',
      accountName: '',
    };

    const record = recordFromDraft(draft, { now, random: () => 0.5 });

    expect(record.bank).toBe('manual');
    expect(record.origin).toBe('manual');
    expect(record.status).toBe('posted');
    expect(record.direction).toBe('income');
    expect(record.transactionType).toBe('incomingTransfer');
    expect(record.amountMinor).toBe(25_050);
    expect(record.merchant).toBe('Zwrot podatku');
    expect(record.accountName).toBeUndefined();
    expect(record.review).toBeUndefined();
    expect(new Date(record.occurredAt).getHours()).toBe(9);
  });

  test('keeps the identity of the edited transaction and clears its review', () => {
    const draft = { ...draftFromRecord(captured), currency: 'eur' };
    const record = recordFromDraft(draft, { record: captured, now });

    expect(record.id).toBe(captured.id);
    expect(record.bank).toBe('millennium');
    expect(record.origin).toBe('capture');
    expect(record.transactionType).toBe('cardPayment');
    expect(record.capturedAt).toBe(captured.capturedAt);
    expect(record.currency).toBe('EUR');
    expect(record.amountMinor).toBe(1234);
    expect(record.review).toBeUndefined();
  });
});

describe('kindForDirection', () => {
  test('keeps a kind the direction allows', () => {
    expect(kindForDirection('expense', 'cardPayment')).toBe('cardPayment');
    expect(kindForDirection('expense', 'other')).toBe('other');
  });

  test('falls back when the direction cannot carry that kind', () => {
    expect(kindForDirection('income', 'cardPayment')).toBe('incomingTransfer');
    expect(kindForDirection('expense', 'incomingTransfer')).toBe('cardPayment');
  });
});

describe('recordFromDraft kinds', () => {
  test('an Apple Pay expense keeps the card payment kind, "Inne" carries none', () => {
    const now = new Date(2026, 8, 21, 9, 30);
    const draft = { ...emptyDraft(now), amount: '19,99', name: 'Lidl' };

    expect(recordFromDraft(draft, { now }).transactionType).toBe('cardPayment');
    expect(recordFromDraft({ ...draft, kind: 'other' }, { now }).transactionType).toBeUndefined();
  });
});

describe('confirmedRecord', () => {
  test('clears the review without touching the facts', () => {
    const record = confirmedRecord(captured);

    expect(record.id).toBe(captured.id);
    expect(record.amountMinor).toBe(captured.amountMinor);
    expect(record.review).toBeUndefined();
  });
});

describe('category corrections', () => {
  const now = new Date(2026, 8, 21, 9, 30);

  test('carries a corrected category onto the transaction without touching the amount', () => {
    const draft = { ...draftFromRecord(captured), category: 'eatingOut' };
    const record = recordFromDraft(draft, { record: captured, now });

    expect(record.category).toBe('eatingOut');
    expect(record.amountMinor).toBe(captured.amountMinor);
  });

  test('reads back the category the transaction already carries', () => {
    expect(draftFromRecord({ ...captured, category: 'groceries' }).category).toBe('groceries');
    expect(draftFromRecord(captured).category).toBe('');
  });

  test('leaves a transaction uncategorized when the user picked nothing', () => {
    const draft = { ...emptyDraft(now), amount: '19,99', name: 'Lidl' };

    expect(recordFromDraft(draft, { now }).category).toBeUndefined();
  });
});
