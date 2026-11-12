import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { groupSpending } from '@/features/data/classification/spending-groups';

import { groupInWindow } from './merchant-period';

const endMs = new Date(2026, 10, 12, 12).getTime();
const dayMs = 86_400_000;

function expense(id: string, daysAgo: number, merchant: string, amountMinor: number): IngestionRecord {
  const occurredAt = new Date(endMs - daysAgo * dayMs).toISOString();

  return {
    id,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor,
    currency: 'PLN',
    merchant,
    occurredAt,
    capturedAt: occurredAt,
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'pending',
    origin: 'capture',
  };
}

const records = [
  expense('recent', 2, 'Zabka', 1500),
  expense('older', 40, 'Zabka', 2500),
  expense('oldest', 200, 'Zabka', 4000),
  expense('other', 3, 'Lidl', 1000),
];

const weekWindow = { startMs: endMs - 7 * dayMs, endMs };

function openedShop() {
  const group = groupSpending(records, { window: weekWindow, rules: [], dimension: 'merchant' }).find((candidate) =>
    candidate.records.some((record) => record.id === 'recent'),
  );

  if (group === undefined) {
    throw new Error('missing shop');
  }

  return group;
}

describe('groupInWindow', () => {
  test('recounts the opened shop for a longer period', () => {
    const zabkaThisWeek = openedShop();
    const quarter = groupInWindow(zabkaThisWeek, records, { startMs: endMs - 90 * dayMs, endMs }, []);

    expect(quarter.key).toBe(zabkaThisWeek.key);
    expect(quarter.totalMinor).toBe(4000);
    expect(quarter.records.map((record) => record.id)).toEqual(['recent', 'older']);
  });

  test('takes every payment on Max', () => {
    const zabkaThisWeek = openedShop();
    const all = groupInWindow(zabkaThisWeek, records, { startMs: null, endMs }, []);

    expect(all.count).toBe(3);
    expect(all.averageMinor).toBe(2667);
  });

  test('keeps the shop with nothing spent when the period has no payments there', () => {
    const zabkaThisWeek = openedShop();
    const empty = groupInWindow(zabkaThisWeek, records, { startMs: endMs - dayMs, endMs }, []);

    expect(empty.name).toBe(zabkaThisWeek.name);
    expect(empty.totalMinor).toBe(0);
    expect(empty.records).toEqual([]);
  });
});
