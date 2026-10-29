import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { classifyTransaction } from '@/features/data/classification/classify-transaction';

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
  partyKey?: string;
  amountMinor?: number;
}

export interface RecurringCandidatePayment {
  amountMinor: number;
  lastChargedAt: string;
  chargeCount: number;
}

export interface RecurringCandidate {
  key: string;
  name: string;
  lastAmountMinor: number;
  lastChargedAt: string;
  chargeCount: number;
  payments: RecurringCandidatePayment[];
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
const everydayShoppingCategories = new Set(['groceries', 'eatingOut']);
const interleavedShare = 0.5;
const minimumInterleavedIntervals = 2;

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

function chargePairs(charges: IngestionRecord[]): [IngestionRecord, IngestionRecord][] {
  return charges.slice(1).flatMap((current, index): [IngestionRecord, IngestionRecord][] => {
    const previous = charges[index];

    return previous === undefined ? [] : [[previous, current]];
  });
}

function intervalDays(charges: IngestionRecord[]): number[] {
  return chargePairs(charges).map(([previous, current]) => (occurredMs(current) - occurredMs(previous)) / dayMs);
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

function toleranceFor(amountMinor: number): number {
  return Math.max(amountMinor * amountTolerance, minimumToleranceMinor);
}

function isSimilarAmount(amountMinor: number, referenceMinor: number): boolean {
  return Math.abs(amountMinor - referenceMinor) <= toleranceFor(referenceMinor);
}

function byOccurrence(left: IngestionRecord, right: IngestionRecord): number {
  return occurredMs(left) - occurredMs(right);
}

function amountClusters(records: IngestionRecord[]): IngestionRecord[][] {
  const clusters: IngestionRecord[][] = [];
  let current: IngestionRecord[] = [];
  let referenceMinor = 0;

  for (const record of [...records].sort((left, right) => left.amountMinor - right.amountMinor)) {
    if (current.length > 0 && !isSimilarAmount(record.amountMinor, referenceMinor)) {
      clusters.push(current);
      current = [];
    }

    if (current.length === 0) {
      referenceMinor = record.amountMinor;
    }

    current.push(record);
  }

  if (current.length > 0) {
    clusters.push(current);
  }

  return clusters.map((cluster) => cluster.sort(byOccurrence));
}

export function trackedPaymentKey(partyKey: string, amountMinor: number): string {
  return `${partyKey}#${amountMinor}`;
}

function clusterKey(partyKey: string, cluster: IngestionRecord[]): string {
  return `${partyKey}@${cluster[0]?.amountMinor ?? 0}`;
}

function trackedPartyKey(tracked: TrackedPayment): string {
  return tracked.partyKey ?? tracked.key;
}

function trackedRecords(tracked: TrackedPayment, records: IngestionRecord[]): IngestionRecord[] {
  if (tracked.amountMinor !== undefined) {
    const referenceMinor = tracked.amountMinor;

    return records.filter((record) => isSimilarAmount(record.amountMinor, referenceMinor));
  }

  const latestMs = (cluster: IngestionRecord[]) => Math.max(...cluster.map(occurredMs));
  const [busiest] = amountClusters(records).sort(
    (left, right) => right.length - left.length || latestMs(right) - latestMs(left),
  );

  return busiest ?? [];
}

function hasSteadyAmount(amounts: number[]): boolean {
  const typical = median(amounts);
  const tolerance = toleranceFor(typical);
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

function priceChanges(amounts: number[]): number {
  return amounts.filter((amount, index) => index > 0 && amount !== amounts[index - 1]).length;
}

function interleavedIntervals(charges: IngestionRecord[], otherVisitsMs: number[]): number {
  let visitIndex = 0;
  let interleaved = 0;

  for (const [previous, current] of chargePairs(charges)) {
    while (visitIndex < otherVisitsMs.length && (otherVisitsMs[visitIndex] ?? 0) <= occurredMs(previous)) {
      visitIndex += 1;
    }

    if (visitIndex < otherVisitsMs.length && (otherVisitsMs[visitIndex] ?? 0) < occurredMs(current)) {
      interleaved += 1;
    }
  }

  return interleaved;
}

function looksLikeShopping(group: PartyGroup, charges: IngestionRecord[], otherVisitsMs: number[]): boolean {
  if (group.category === subscriptionCategory) {
    return false;
  }

  if (
    everydayShoppingCategories.has(group.category ?? '') &&
    priceChanges(charges.map((charge) => charge.amountMinor)) > 1
  ) {
    return true;
  }

  const interleaved = interleavedIntervals(charges, otherVisitsMs);

  return interleaved >= minimumInterleavedIntervals && interleaved / (charges.length - 1) >= interleavedShare;
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
    group.records.sort(byOccurrence);
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

function trackedPayment(
  group: PartyGroup,
  records: IngestionRecord[],
  tracked: TrackedPayment,
  now: Date,
): RecurringPayment | null {
  const charges = records.slice(-analysedCharges);
  const last = charges[charges.length - 1];

  if (last === undefined) {
    return null;
  }

  const previous = charges[charges.length - 2];
  const rule = cadences[tracked.cadence];
  const next = upcomingChargeAfter(last.occurredAt, tracked.cadence, now);

  return {
    key: tracked.key,
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

function regularCadence(group: PartyGroup, charges: IngestionRecord[]): Cadence | null {
  if (charges.length < 2) {
    return null;
  }

  const cadence = cadenceFor(intervalDays(charges));

  if (cadence === null) {
    return null;
  }

  const isKnownSubscription = group.category === subscriptionCategory && cadence === 'monthly';

  return charges.length < cadences[cadence].minimumCharges && !isKnownSubscription ? null : cadence;
}

function detectedPayment(
  key: string,
  group: PartyGroup,
  records: IngestionRecord[],
  otherVisitsMs: number[],
  now: Date,
): RecurringPayment | null {
  const charges = records.slice(-analysedCharges);
  const cadence = regularCadence(group, charges);

  if (cadence === null) {
    return null;
  }

  if (!hasSteadyAmount(charges.map((charge) => charge.amountMinor))) {
    return null;
  }

  if (looksLikeShopping(group, charges, otherVisitsMs)) {
    return null;
  }

  const rule = cadences[cadence];

  const last = charges[charges.length - 1];
  const previous = charges[charges.length - 2];

  if (last === undefined || previous === undefined) {
    return null;
  }

  const next = nextChargeAfter(last.occurredAt, cadence);
  const overdueMs = now.getTime() - next.getTime();

  return {
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
  const payments: RecurringPayment[] = [];

  for (const [partyKey, group] of groups) {
    let remaining = group.records;

    for (const entry of tracked.filter((payment) => trackedPartyKey(payment) === partyKey)) {
      const matched = trackedRecords(entry, remaining);
      const matchedIds = new Set(matched.map((record) => record.id));
      remaining = remaining.filter((record) => !matchedIds.has(record.id));
      const payment = trackedPayment(group, matched, entry, now);

      if (payment !== null) {
        payments.push(payment);
      }
    }

    const clusters = amountClusters(remaining);
    const regularIds = new Set(
      clusters
        .filter((cluster) => regularCadence(group, cluster.slice(-analysedCharges)) !== null)
        .flatMap((cluster) => cluster.map((record) => record.id)),
    );
    const otherVisitsMs = remaining.filter((record) => !regularIds.has(record.id)).map(occurredMs);

    for (const cluster of clusters) {
      const key = clusterKey(partyKey, cluster);

      if (dismissed.has(partyKey) || dismissed.has(key)) {
        continue;
      }

      const payment = detectedPayment(key, group, cluster, otherVisitsMs, now);

      if (payment !== null) {
        payments.push(payment);
      }
    }
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
  existing: RecurringPayment[],
): RecurringCandidate[] {
  const coveredIds = new Set(existing.flatMap((payment) => payment.records.map((record) => record.id)));
  const candidates: RecurringCandidate[] = [];

  for (const [key, group] of groupExpensesByParty(records, rules, now)) {
    const payments = amountClusters(group.records)
      .filter((cluster) => !cluster.some((record) => coveredIds.has(record.id)))
      .flatMap((cluster): RecurringCandidatePayment[] => {
        const last = cluster[cluster.length - 1];

        return last === undefined
          ? []
          : [{ amountMinor: last.amountMinor, lastChargedAt: last.occurredAt, chargeCount: cluster.length }];
      })
      .sort((left, right) => new Date(right.lastChargedAt).getTime() - new Date(left.lastChargedAt).getTime());
    const [latest] = payments;

    if (latest === undefined) {
      continue;
    }

    candidates.push({
      key,
      name: group.name,
      lastAmountMinor: latest.amountMinor,
      lastChargedAt: latest.lastChargedAt,
      chargeCount: payments.reduce((sum, payment) => sum + payment.chargeCount, 0),
      payments,
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
