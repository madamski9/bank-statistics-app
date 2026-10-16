import type { IngestionRecord } from '@bankstats/ingestion-native';

import { currentCopy } from '@/features/app-shell/localization/language';
import { formatAmount } from '@/features/app-shell/formatting/formatting';
import { categoryLabel } from '@/features/data/classification/categories';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { classifyTransaction } from '@/features/data/classification/classify-transaction';
import { affectsStatistics } from '@/features/home/transactions/record/transaction-record';

import { alertsCopy } from '../alerts-copy';
import { alertProgress, matchesScope, reportingCurrency, type AlertProgress } from '../evaluation/alert-evaluation';
import {
  defaultAlertTone,
  isSilenced,
  notificationShares,
  toneDelivery,
  type AlertRule,
  type AlertScope,
  type AlertTone,
} from '../rules/alert-rule';
import type { AlertMessage } from './alert-message';
import { budgetAlertCopy, budgetScopeCopy, foodBudgetAlertCopy, type BudgetAlertTier } from './budget-alert-copy';
import { alertStandingCopy, foodPaymentAlertCopy, paymentAlertCopy, type PaymentAlertTier } from './payment-alert-copy';

export interface PaymentAlertContext {
  reference: Date;
  rules: CategorizationRule[];
  hasAggressiveTone?: boolean;
}

export function deliveredTone(tone: AlertTone | undefined, hasAggressiveTone: boolean): AlertTone {
  const chosen = tone ?? defaultAlertTone;

  return chosen === 'aggressive' && !hasAggressiveTone ? 'mild' : chosen;
}

const foodCategories: ReadonlySet<string> = new Set(['eatingOut']);

export function isFoodPayment(record: IngestionRecord, rules: CategorizationRule[]): boolean {
  const { category } = classifyTransaction(record, rules);

  return category !== undefined && foodCategories.has(category);
}

export function paymentAlertTier(share: number): PaymentAlertTier {
  if (share >= 1) {
    return 'over';
  }

  if (share >= 0.9) {
    return 'last';
  }

  if (share >= 0.8) {
    return 'most';
  }

  return share >= 0.5 ? 'half' : 'under';
}

function crossedTier(before: AlertProgress, after: AlertProgress): BudgetAlertTier | null {
  const crossed = notificationShares.filter((share) => {
    const thresholdMinor = Math.round(after.targetMinor * share);

    return before.amountMinor < thresholdMinor && after.amountMinor >= thresholdMinor;
  });
  const highest = crossed[crossed.length - 1];

  if (highest === undefined) {
    return null;
  }

  const tier = paymentAlertTier(highest);

  return tier === 'under' ? null : tier;
}

function variantIndex(seed: string, count: number): number {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  }

  return count === 0 ? 0 : hash % count;
}

function pick<Text>(variants: Text[], seed: string): Text | undefined {
  return variants[variantIndex(seed, variants.length)];
}

function capitalized(value: string): string {
  return `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}`;
}

function budgetWhere(scope: AlertScope): string {
  const copy = currentCopy(budgetScopeCopy);

  return scope.kind === 'category' ? copy.category(categoryLabel(scope.id)) : copy.all;
}

function shopName(record: IngestionRecord, rules: CategorizationRule[]): string {
  const classified = classifyTransaction(record, rules);

  return classified.merchantName ?? classified.counterpartyName ?? classified.bankLabel ?? '';
}

const titleLimit = 30;

function notificationTitle(title: string): string {
  if (title.length <= titleLimit) {
    return title;
  }

  let shortened = '';

  for (const character of title) {
    if (shortened.length + character.length >= titleLimit) {
      break;
    }

    shortened += character;
  }

  return `${shortened.trimEnd()}…`;
}

function withStanding(text: { title: string; body: string }, standing: string): AlertMessage {
  return {
    title: notificationTitle(text.title),
    body: [text.body, standing].filter((part) => part !== '').join(' '),
  };
}

function isWithinWindow(record: IngestionRecord, progress: AlertProgress): boolean {
  const occurredMs = new Date(record.occurredAt).getTime();

  return !Number.isNaN(occurredMs) && occurredMs >= progress.window.startMs && occurredMs < progress.window.endMs;
}

export function paymentAlertMessage(
  rule: AlertRule,
  record: IngestionRecord,
  records: IngestionRecord[],
  { reference, rules, hasAggressiveTone = false }: PaymentAlertContext,
): AlertMessage | null {
  const delivery = toneDelivery(rule);

  if (
    delivery === null ||
    !rule.isActive ||
    isSilenced(rule) ||
    record.direction !== 'expense' ||
    record.currency !== reportingCurrency ||
    !affectsStatistics(record) ||
    !matchesScope(record, rule.scope, rules)
  ) {
    return null;
  }

  const progress = alertProgress(rule, records, { reference, rules });

  if (!isWithinWindow(record, progress)) {
    return null;
  }

  const tone = deliveredTone(rule.tone, hasAggressiveTone);
  const isOver = progress.amountMinor > progress.targetMinor;
  const standing = currentCopy(alertStandingCopy);
  const facts = {
    period: capitalized(currentCopy(alertsCopy).periods[rule.period.kind]),
    payment: formatAmount(record.amountMinor, progress.currency),
    spent: formatAmount(progress.amountMinor, progress.currency),
    target: formatAmount(progress.targetMinor, progress.currency),
    remaining: formatAmount(Math.max(progress.targetMinor - progress.amountMinor, 0), progress.currency),
    over: formatAmount(Math.max(progress.amountMinor - progress.targetMinor, 0), progress.currency),
  };

  if (rule.scope.kind === 'merchant') {
    const copy = isFoodPayment(record, rules) ? foodPaymentAlertCopy : paymentAlertCopy;
    const text = pick(currentCopy(copy)[tone][paymentAlertTier(progress.share)], record.id);

    const shop = rule.scope.name;

    return text === undefined
      ? null
      : withStanding(
          text({ ...facts, shop }),
          isOver ? standing.over(shop, facts.over) : standing.remaining(shop, facts.remaining),
        );
  }

  const before = alertProgress(
    rule,
    records.filter((candidate) => candidate.id !== record.id),
    { reference, rules },
  );
  const tier = crossedTier(before, progress);

  if (tier === null) {
    return null;
  }

  const isFood = rule.scope.kind === 'category' && foodCategories.has(rule.scope.id);
  const copy = isFood ? foodBudgetAlertCopy : budgetAlertCopy;
  const text = pick(currentCopy(copy)[tone][tier], record.id);

  const where = budgetWhere(rule.scope);
  const shop = shopName(record, rules);

  return text === undefined
    ? null
    : withStanding(
        text({ ...facts, where }),
        isOver ? standing.budgetOver(shop, where, facts.over) : standing.budgetRemaining(shop, where, facts.remaining),
      );
}

export function paymentAlertMessages(
  alertRules: AlertRule[],
  record: IngestionRecord,
  records: IngestionRecord[],
  context: PaymentAlertContext,
): AlertMessage[] {
  return alertRules.flatMap((rule) => {
    const message = paymentAlertMessage(rule, record, records, context);

    return message === null ? [] : [message];
  });
}
