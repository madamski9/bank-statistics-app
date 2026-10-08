import type { IngestionRecord } from '@bankstats/ingestion-native';

import { resolveMerchant } from '@/features/classification/merchant-alias';
import { classifyParty } from '@/features/classification/party';
import { inReportingCurrency } from '@/features/currency-conversion/exchange-rate';

export const ignoreKinds = ['payment', 'outgoingTransfer', 'incomingTransfer'] as const;

export type IgnoreKind = (typeof ignoreKinds)[number];

export interface IgnoreTarget {
  kind: IgnoreKind;
  name: string;
}

export interface IgnoreRule extends IgnoreTarget {
  since?: string;
}

export interface IgnoreCandidate extends IgnoreTarget {
  key: string;
  count: number;
  totalMinor: number;
  lastOccurredAt: string;
}

export function normalizeIgnoredName(name: string): string {
  return name
    .toLocaleLowerCase('pl')
    .replace(/ł/gu, 'l')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function ignoreKeyOf(target: IgnoreTarget): string {
  return `${target.kind}:${normalizeIgnoredName(target.name)}`;
}

function ignoreKindOf(record: IngestionRecord, partyKind: 'merchant' | 'counterparty'): IgnoreKind | null {
  if (partyKind === 'counterparty') {
    return record.direction === 'income' ? 'incomingTransfer' : 'outgoingTransfer';
  }

  return record.direction === 'expense' ? 'payment' : null;
}

interface RecordParty extends IgnoreTarget {
  label: string;
}

function recordParty(record: IngestionRecord): RecordParty | null {
  if (record.origin === 'manual') {
    return null;
  }

  const party = classifyParty(record);

  if (party.kind === 'unknown' || party.name === undefined) {
    return null;
  }

  const kind = ignoreKindOf(record, party.kind);

  if (kind === null || normalizeIgnoredName(party.name) === '') {
    return null;
  }

  const name = kind === 'payment' ? resolveMerchant(party.name).name : party.name;

  return { kind, name, label: party.name };
}

export function ignoreTargetFor(record: IngestionRecord): IgnoreTarget | null {
  const party = recordParty(record);

  return party === null ? null : { kind: party.kind, name: party.name };
}

function nameContains(partyName: string, ruleName: string): boolean {
  return ` ${normalizeIgnoredName(partyName)} `.includes(` ${normalizeIgnoredName(ruleName)} `);
}

export function matchesTarget(record: IngestionRecord, target: IgnoreTarget): boolean {
  const party = recordParty(record);

  return (
    party !== null &&
    party.kind === target.kind &&
    (nameContains(party.name, target.name) || nameContains(party.label, target.name))
  );
}

function appliesAt(rule: IgnoreRule, record: IngestionRecord): boolean {
  return rule.since === undefined || Date.parse(record.occurredAt) >= Date.parse(rule.since);
}

export function isIgnored(record: IngestionRecord, rules: readonly IgnoreRule[]): boolean {
  return rules.some((rule) => appliesAt(rule, record) && matchesTarget(record, rule));
}

export function ruleFor(rules: readonly IgnoreRule[], target: IgnoreTarget): IgnoreRule | null {
  const key = ignoreKeyOf(target);

  return rules.find((rule) => ignoreKeyOf(rule) === key) ?? null;
}

export function withIgnoreRule(rules: readonly IgnoreRule[], rule: IgnoreRule): IgnoreRule[] {
  const name = rule.name.replace(/\s+/gu, ' ').trim();

  if (normalizeIgnoredName(name) === '') {
    return [...rules];
  }

  const next: IgnoreRule =
    rule.since === undefined ? { kind: rule.kind, name } : { kind: rule.kind, name, since: rule.since };
  const key = ignoreKeyOf(next);

  return [...rules.filter((existing) => ignoreKeyOf(existing) !== key), next];
}

export function withoutIgnoreRule(rules: readonly IgnoreRule[], target: IgnoreTarget): IgnoreRule[] {
  const key = ignoreKeyOf(target);

  return rules.filter((existing) => ignoreKeyOf(existing) !== key);
}

export function ignoreCandidates(
  records: readonly IngestionRecord[],
  rules: readonly IgnoreRule[],
): IgnoreCandidate[] {
  const ruled = new Set(rules.map(ignoreKeyOf));
  const byKey = new Map<string, IgnoreCandidate>();

  for (const record of records) {
    const target = ignoreTargetFor(record);

    if (target === null) {
      continue;
    }

    const key = ignoreKeyOf(target);

    if (ruled.has(key)) {
      continue;
    }

    const amountMinor = inReportingCurrency(record)?.amountMinor ?? 0;
    const existing = byKey.get(key);

    if (existing === undefined) {
      byKey.set(key, { ...target, key, count: 1, totalMinor: amountMinor, lastOccurredAt: record.occurredAt });
      continue;
    }

    existing.count += 1;
    existing.totalMinor += amountMinor;

    if (Date.parse(record.occurredAt) > Date.parse(existing.lastOccurredAt)) {
      existing.lastOccurredAt = record.occurredAt;
      existing.name = target.name;
    }
  }

  return [...byKey.values()].sort(
    (left, right) => Date.parse(right.lastOccurredAt) - Date.parse(left.lastOccurredAt),
  );
}

export function matchesCandidateQuery(candidate: IgnoreCandidate, query: string): boolean {
  const needle = normalizeIgnoredName(query);

  return needle === '' || normalizeIgnoredName(candidate.name).includes(needle);
}

export function historyCount(records: readonly IngestionRecord[], target: IgnoreTarget): number {
  return records.filter((record) => matchesTarget(record, target)).length;
}

export function isIgnoreRule(value: unknown): value is IgnoreRule {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<IgnoreRule>;

  return (
    ignoreKinds.some((kind) => kind === candidate.kind) &&
    typeof candidate.name === 'string' &&
    normalizeIgnoredName(candidate.name) !== '' &&
    (candidate.since === undefined ||
      (typeof candidate.since === 'string' && !Number.isNaN(Date.parse(candidate.since))))
  );
}
