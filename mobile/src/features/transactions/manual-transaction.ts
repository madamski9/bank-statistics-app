import type { IngestionRecord } from '@bankstats/ingestion-native';

import {
  generalManualAccountId,
  withGeneralAccounts,
  type FinancialAccount,
} from '@/features/financial-accounts/financial-account';

export type TransactionDirection = IngestionRecord['direction'];

export type TransactionKind = NonNullable<IngestionRecord['transactionType']> | 'other';

export interface TransactionDraft {
  direction: TransactionDirection;
  kind: TransactionKind;
  amount: string;
  currency: string;
  name: string;
  category: string;
  accountId: string;
  date: string;
  time: string;
}

export const transactionKindOptions: Record<
  TransactionDirection,
  { value: TransactionKind; label: string }[]
> = {
  expense: [
    { value: 'cardPayment', label: 'Karta lub Apple Pay' },
    { value: 'outgoingTransfer', label: 'Przelew' },
    { value: 'other', label: 'Inne' },
  ],
  income: [
    { value: 'incomingTransfer', label: 'Przelew' },
    { value: 'other', label: 'Inne' },
  ],
};

export function kindForDirection(
  direction: TransactionDirection,
  kind: TransactionKind,
): TransactionKind {
  const options = transactionKindOptions[direction];

  return options.some((option) => option.value === kind) ? kind : options[0].value;
}

const datePattern = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const timePattern = /^(\d{1,2}):(\d{2})$/;
const amountPattern = /^(\d+)(?:[.,](\d{1,2}))?$/;
const currencyPattern = /^[A-Z]{3}$/;

export function formatDraftDate(moment: Date): string {
  const day = String(moment.getDate()).padStart(2, '0');
  const month = String(moment.getMonth() + 1).padStart(2, '0');

  return `${day}.${month}.${moment.getFullYear()}`;
}

export function formatDraftTime(moment: Date): string {
  return `${String(moment.getHours()).padStart(2, '0')}:${String(moment.getMinutes()).padStart(2, '0')}`;
}

export function emptyDraft(now: Date): TransactionDraft {
  return {
    direction: 'expense',
    kind: 'cardPayment',
    amount: '',
    currency: 'PLN',
    name: '',
    category: '',
    accountId: generalManualAccountId,
    date: formatDraftDate(now),
    time: formatDraftTime(now),
  };
}

export function draftFromRecord(record: IngestionRecord): TransactionDraft {
  const occurredAt = new Date(record.occurredAt);
  const moment = Number.isNaN(occurredAt.getTime()) ? new Date(record.capturedAt) : occurredAt;
  const units = Math.trunc(record.amountMinor / 100);
  const fraction = String(record.amountMinor % 100).padStart(2, '0');

  return {
    direction: record.direction,
    kind: record.transactionType ?? 'other',
    amount: `${units},${fraction}`,
    currency: record.currency,
    name: record.merchant ?? '',
    category: record.category ?? '',
    accountId: record.origin === 'manual' ? (record.accountId ?? generalManualAccountId) : '',
    date: formatDraftDate(moment),
    time: formatDraftTime(moment),
  };
}

export function parseAmountMinor(value: string): number | null {
  const normalized = value.replace(/[\s ]/g, '');
  const match = amountPattern.exec(normalized);

  if (match === null) {
    return null;
  }

  const units = Number.parseInt(match[1], 10);
  const fraction = Number.parseInt((match[2] ?? '').padEnd(2, '0') || '0', 10);
  const minor = units * 100 + fraction;

  return minor > 0 ? minor : null;
}

export function parseDraftMoment(date: string, time: string): Date | null {
  const dateMatch = datePattern.exec(date.trim());
  const timeMatch = timePattern.exec(time.trim());

  if (dateMatch === null || timeMatch === null) {
    return null;
  }

  const day = Number.parseInt(dateMatch[1], 10);
  const month = Number.parseInt(dateMatch[2], 10);
  const year = Number.parseInt(dateMatch[3], 10);
  const hours = Number.parseInt(timeMatch[1], 10);
  const minutes = Number.parseInt(timeMatch[2], 10);
  const moment = new Date(year, month - 1, day, hours, minutes, 0, 0);

  const isRoundTrip =
    moment.getFullYear() === year &&
    moment.getMonth() === month - 1 &&
    moment.getDate() === day &&
    moment.getHours() === hours &&
    moment.getMinutes() === minutes;

  return isRoundTrip ? moment : null;
}

export function draftError(draft: TransactionDraft): string | null {
  if (parseAmountMinor(draft.amount) === null) {
    return 'Podaj kwotę większą od zera.';
  }

  if (!currencyPattern.test(draft.currency.trim().toUpperCase())) {
    return 'Waluta to trzyliterowy kod, na przykład PLN.';
  }

  if (parseDraftMoment(draft.date, draft.time) === null) {
    return 'Podaj datę jako DD.MM.RRRR i godzinę jako GG:MM.';
  }

  return null;
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();

  return trimmed === '' ? undefined : trimmed;
}

function manualIdentifier(now: Date, random: () => number): string {
  return `manual-${now.getTime().toString(36)}-${Math.floor(random() * 0xffffff)
    .toString(36)
    .padStart(5, '0')}`;
}

interface DraftContext {
  record?: IngestionRecord | null;
  now: Date;
  random?: () => number;
  accounts?: FinancialAccount[];
}

function accountFields(
  draft: TransactionDraft,
  base: Pick<IngestionRecord, 'origin' | 'accountId' | 'accountName'>,
  accounts: FinancialAccount[],
): Pick<IngestionRecord, 'accountId' | 'accountName'> {
  if (base.origin !== 'manual') {
    return { accountId: base.accountId, accountName: base.accountName };
  }

  const account =
    accounts.find((candidate) => candidate.id === draft.accountId) ??
    withGeneralAccounts(accounts).find((candidate) => candidate.id === generalManualAccountId);

  return { accountId: account?.id, accountName: account?.name };
}

export function recordFromDraft(
  draft: TransactionDraft,
  { record = null, now, random = Math.random, accounts = withGeneralAccounts([]) }: DraftContext,
): IngestionRecord {
  const amountMinor = parseAmountMinor(draft.amount);
  const moment = parseDraftMoment(draft.date, draft.time);

  if (amountMinor === null || moment === null) {
    throw new Error('Szkic transakcji jest niekompletny.');
  }

  const base = record ?? {
    id: manualIdentifier(now, random),
    bank: 'manual' as const,
    capturedAt: now.toISOString(),
    sourceApp: 'manual',
    status: 'posted' as const,
    origin: 'manual' as const,
  };

  return {
    ...base,
    review: undefined,
    direction: draft.direction,
    transactionType: draft.kind === 'other' ? undefined : draft.kind,
    amountMinor,
    currency: draft.currency.trim().toUpperCase(),
    merchant: optional(draft.name),
    category: optional(draft.category),
    ...accountFields(draft, base, accounts),
    occurredAt: moment.toISOString(),
  };
}

export function confirmedRecord(record: IngestionRecord): IngestionRecord {
  return { ...record, review: undefined };
}
