import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { groupSpending, type SpendingGroup } from '@/features/classification/spending-groups';

import { recordsOfEvent, type SpendingEvent } from './spending-event';

export interface EventSummary {
  event: SpendingEvent;
  expenseMinor: number;
  incomeMinor: number;
  netMinor: number;
  count: number;
  days: number;
  dailyExpenseMinor: number;
  categories: SpendingGroup[];
  merchants: SpendingGroup[];
  records: IngestionRecord[];
}

const dayMs = 86_400_000;
const everything = { startMs: null, endMs: Number.MAX_SAFE_INTEGER };

export function eventDays(event: SpendingEvent, now: Date): number {
  const startMs = new Date(event.startedAt).getTime();
  const endMs = event.endedAt === undefined ? now.getTime() : new Date(event.endedAt).getTime();

  return Math.max(1, Math.ceil((endMs - startMs) / dayMs));
}

export function summarizeEvent(
  records: IngestionRecord[],
  event: SpendingEvent,
  events: SpendingEvent[],
  rules: CategorizationRule[],
  now: Date,
): EventSummary {
  const included = recordsOfEvent(records, event, events).sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
  const expenseMinor = included
    .filter((record) => record.direction === 'expense')
    .reduce((sum, record) => sum + record.amountMinor, 0);
  const incomeMinor = included
    .filter((record) => record.direction === 'income')
    .reduce((sum, record) => sum + record.amountMinor, 0);
  const days = eventDays(event, now);

  return {
    event,
    expenseMinor,
    incomeMinor,
    netMinor: incomeMinor - expenseMinor,
    count: included.length,
    days,
    dailyExpenseMinor: Math.round(expenseMinor / days),
    categories: groupSpending(included, { window: everything, rules, dimension: 'category' }),
    merchants: groupSpending(included, { window: everything, rules, dimension: 'merchant' }),
    records: included,
  };
}
