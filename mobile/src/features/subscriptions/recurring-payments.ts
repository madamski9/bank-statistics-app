import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { classifyTransaction } from '@/features/classification/classify-transaction';

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringPayment {
  key: string;
  name: string;
  cadence: Cadence;
  category?: string;
  lastAmountMinor: number;
  previousAmountMinor: number | null;
  priceChangeMinor: number;
  monthlyCostMinor: number;
  chargeCount: number;
  lastChargedAt: string;
  nextExpectedAt: string;
  isActive: boolean;
  isTracked: boolean;
  records: IngestionRecord[];
}

export interface TrackedPayment {
  key: string;
  name: string;
  cadence: Cadence;
}

export interface RecurringCandidate {
  key: string;
  name: string;
  lastAmountMinor: number;
  lastChargedAt: string;
  chargeCount: number;
}

interface CadenceRule {
  minimumDays: number;
  maximumDays: number;
  months: number;
  days: number;
  minimumCharges: number;
}

const dayMs = 86_400_000;
const averageMonthDays = 30.44;
const amountTolerance = 0.15;
const minimumToleranceMinor = 200;
const matchingShare = 0.75;
const graceDays = 5;
const analysedCharges = 12;
const subscriptionCategory = 'services';

const cadences: Record<Cadence, CadenceRule> = {
  weekly: { minimumDays: 5, maximumDays: 9, months: 0, days: 7, minimumCharges: 4 },
  monthly: { minimumDays: 26, maximumDays: 35, months: 1, days: averageMonthDays, minimumCharges: 3 },
  quarterly: { minimumDays: 85, maximumDays: 97, months: 3, days: 3 * averageMonthDays, minimumCharges: 2 },
  yearly: { minimumDays: 350, maximumDays: 380, months: 12, days: 365, minimumCharges: 2 },
};

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length === 0) {
    return 0;
  }

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

function occurredMs(record: IngestionRecord): number {
  return new Date(record.occurredAt).getTime();
}

function partyOf(record: IngestionRecord, rules: CategorizationRule[]) {
  const classified = classifyTransaction(record, rules);

  if (classified.partyKind === 'merchant' && classified.merchantKey !== undefined) {
    return {
      key: `merchant:${classified.merchantKey}`,
      name: classified.merchantName ?? classified.merchantKey,
      category: classified.category,
    };
  }

  if (classified.partyKind === 'counterparty' && classified.counterpartyName !== undefined) {
    return {
      key: `counterparty:${classified.counterpartyName.toLocaleLowerCase('pl')}`,
      name: classified.counterpartyName,
      category: classified.category,
    };
  }

  return null;
}

function cadenceFor(intervals: number[]): Cadence | null {
  const typical = median(intervals);

  for (const [cadence, rule] of Object.entries(cadences) as [Cadence, CadenceRule][]) {
    if (typical < rule.minimumDays || typical > rule.maximumDays) {
      continue;
    }

    const fitting = intervals.filter(
      (interval) => interval >= rule.minimumDays && interval <= rule.maximumDays,
    ).length;

    return fitting / intervals.length >= matchingShare ? cadence : null;
  }

  return null;
}

function hasSteadyAmount(amounts: number[]): boolean {
  const typical = median(amounts);
  const tolerance = Math.max(typical * amountTolerance, minimumToleranceMinor);
  const steady = amounts.filter((amount) => Math.abs(amount - typical) <= tolerance).length;

  return steady / amounts.length >= matchingShare;
}

export function nextChargeAfter(lastChargedAt: string, cadence: Cadence, periods = 1): Date {
  const last = new Date(lastChargedAt);
  const rule = cadences[cadence];

  if (rule.months === 0) {
    return new Date(last.getTime() + rule.days * periods * dayMs);
  }

  const next = new Date(last);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + rule.months * periods);
  const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDayOfMonth));

  return next;
}

interface PartyGroup {
  name: string;
  category?: string;
  records: IngestionRecord[];
}

function groupExpensesByParty(
  records: IngestionRecord[],
  rules: CategorizationRule[],
  now: Date,
): Map<string, PartyGroup> {
  const groups = new Map<string, PartyGroup>();

  for (const record of records) {
    if (record.direction !== 'expense' || Number.isNaN(occurredMs(record)) || occurredMs(record) > now.getTime()) {
      continue;
    }

    const party = partyOf(record, rules);

    if (party === null) {
      continue;
    }

    const group = groups.get(party.key) ?? { name: party.name, category: party.category, records: [] };
    group.records.push(record);
    groups.set(party.key, group);
  }

  for (const group of groups.values()) {
    group.records.sort((left, right) => occurredMs(left) - occurredMs(right));
  }

  return groups;
}

export function upcomingChargeAfter(lastChargedAt: string, cadence: Cadence, now: Date): Date {
  const earliestNextMs = now.getTime() - graceDays * dayMs;
  let periods = 1;
  let next = nextChargeAfter(lastChargedAt, cadence);

  while (next.getTime() < earliestNextMs) {
    periods += 1;
    next = nextChargeAfter(lastChargedAt, cadence, periods);
  }

  return next;
}

function trackedPayment(key: string, group: PartyGroup, tracked: TrackedPayment, now: Date): RecurringPayment | null {
  const charges = group.records.slice(-analysedCharges);
  const last = charges[charges.length - 1];

  if (last === undefined) {
    return null;
  }

  const previous = charges[charges.length - 2];
  const rule = cadences[tracked.cadence];
  const next = upcomingChargeAfter(last.occurredAt, tracked.cadence, now);

  return {
    key,
    name: group.name,
    cadence: tracked.cadence,
    category: group.category,
    lastAmountMinor: last.amountMinor,
    previousAmountMinor: previous?.amountMinor ?? null,
    priceChangeMinor: previous === undefined ? 0 : last.amountMinor - previous.amountMinor,
    monthlyCostMinor: Math.round((last.amountMinor * averageMonthDays) / rule.days),
    chargeCount: charges.length,
    lastChargedAt: last.occurredAt,
    nextExpectedAt: next.toISOString(),
    isActive: true,
    isTracked: true,
    records: [...charges].reverse(),
  };
}

export function detectRecurringPayments(
  records: IngestionRecord[],
  rules: CategorizationRule[],
  now: Date,
  dismissed: ReadonlySet<string> = new Set(),
  tracked: TrackedPayment[] = [],
): RecurringPayment[] {
  const groups = groupExpensesByParty(records, rules, now);
  const trackedByKey = new Map(tracked.map((payment) => [payment.key, payment]));
  const payments: RecurringPayment[] = [];

  for (const [key, group] of groups) {
    const trackedEntry = trackedByKey.get(key);

    if (trackedEntry !== undefined) {
      const payment = trackedPayment(key, group, trackedEntry, now);

      if (payment !== null) {
        payments.push(payment);
      }

      continue;
    }

    if (dismissed.has(key)) {
      continue;
    }

    const charges = group.records.slice(-analysedCharges);

    if (charges.length < 2) {
      continue;
    }

    const intervals = charges
      .slice(1)
      .map((charge, index) => (occurredMs(charge) - occurredMs(charges[index] ?? charge)) / dayMs);
    const cadence = cadenceFor(intervals);

    if (cadence === null) {
      continue;
    }

    const rule = cadences[cadence];
    const isKnownSubscription = group.category === subscriptionCategory && cadence === 'monthly';

    if (charges.length < rule.minimumCharges && !isKnownSubscription) {
      continue;
    }

    const amounts = charges.map((charge) => charge.amountMinor);

    if (!hasSteadyAmount(amounts)) {
      continue;
    }

    const last = charges[charges.length - 1];
    const previous = charges[charges.length - 2];

    if (last === undefined || previous === undefined) {
      continue;
    }

    const next = nextChargeAfter(last.occurredAt, cadence);
    const overdueMs = now.getTime() - next.getTime();

    payments.push({
      key,
      name: group.name,
      cadence,
      category: group.category,
      lastAmountMinor: last.amountMinor,
      previousAmountMinor: previous.amountMinor,
      priceChangeMinor: last.amountMinor - previous.amountMinor,
      monthlyCostMinor: Math.round((last.amountMinor * averageMonthDays) / rule.days),
      chargeCount: charges.length,
      lastChargedAt: last.occurredAt,
      nextExpectedAt: next.toISOString(),
      isActive: overdueMs <= Math.max(rule.days * 0.5, graceDays) * dayMs,
      isTracked: false,
      records: [...charges].reverse(),
    });
  }

  return payments.sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return right.monthlyCostMinor - left.monthlyCostMinor;
  });
}

export function recurringCandidates(
  records: IngestionRecord[],
  rules: CategorizationRule[],
  now: Date,
  excludedKeys: ReadonlySet<string>,
): RecurringCandidate[] {
  const candidates: RecurringCandidate[] = [];

  for (const [key, group] of groupExpensesByParty(records, rules, now)) {
    const last = group.records[group.records.length - 1];

    if (last === undefined || excludedKeys.has(key)) {
      continue;
    }

    candidates.push({
      key,
      name: group.name,
      lastAmountMinor: last.amountMinor,
      lastChargedAt: last.occurredAt,
      chargeCount: group.records.length,
    });
  }

  return candidates.sort(
    (left, right) => new Date(right.lastChargedAt).getTime() - new Date(left.lastChargedAt).getTime(),
  );
}

export function upcomingFirst(payments: RecurringPayment[]): RecurringPayment[] {
  return [...payments].sort(
    (left, right) => new Date(left.nextExpectedAt).getTime() - new Date(right.nextExpectedAt).getTime(),
  );
}

export function monthlyRecurringCost(payments: RecurringPayment[]): number {
  return payments
    .filter((payment) => payment.isActive)
    .reduce((sum, payment) => sum + payment.monthlyCostMinor, 0);
}

export function hasPriceIncrease(payment: RecurringPayment): boolean {
  return (
    payment.previousAmountMinor !== null &&
    payment.priceChangeMinor >= 100 &&
    payment.priceChangeMinor / payment.previousAmountMinor >= 0.01
  );
}
