export const maximumChangesPerPush = 500;
export const maximumTextLength = 200;
export const maximumAccountNameLength = 60;

const captureBanks = new Set(['millennium', 'pko']);
const financialAccountBanks = new Set(['manual', 'millennium', 'pko']);
const currencyPattern = /^[A-Z]{3}$/;
const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

interface RevisionedChange {
  clientId: string;
  revision: number;
}

interface TransactionChangeShape extends RevisionedChange {
  bank: string;
  origin: 'capture' | 'manual';
  amountMinor: number;
  currency: string;
  merchant?: string;
  category?: string;
  sourceApp?: string;
  accountId?: string;
  accountName?: string;
  occurredAt: string;
  capturedAt: string;
}

interface FinancialAccountChangeShape extends RevisionedChange {
  bank: string;
  name: string;
}

function isIsoTimestamp(value: string): boolean {
  return isoTimestampPattern.test(value) && !Number.isNaN(Date.parse(value));
}

export function textProblem(value: string | undefined): string | null {
  return value !== undefined && value.length > maximumTextLength
    ? `A text field has at most ${maximumTextLength} characters.`
    : null;
}

function revisionProblem(change: RevisionedChange): string | null {
  if (!Number.isSafeInteger(change.revision) || change.revision < 0) {
    return 'A revision is a non-negative whole number.';
  }

  return textProblem(change.clientId);
}

export function transactionChangeProblem(change: TransactionChangeShape): string | null {
  if (change.origin === 'capture' && !captureBanks.has(change.bank)) {
    return 'Only enabled banks can synchronize captured transactions.';
  }

  if (change.origin === 'manual' && (change.accountId === undefined || change.accountId.trim() === '')) {
    return 'A manual transaction belongs to a Financial Account.';
  }

  if (!Number.isSafeInteger(change.amountMinor) || change.amountMinor <= 0) {
    return 'An amount is a positive whole number of minor units.';
  }

  if (!currencyPattern.test(change.currency)) {
    return 'A currency is a three-letter ISO code.';
  }

  if (!isIsoTimestamp(change.occurredAt) || !isIsoTimestamp(change.capturedAt)) {
    return 'Occurrence and capture times are ISO 8601 timestamps.';
  }

  const texts = [
    change.bank,
    change.merchant,
    change.category,
    change.sourceApp,
    change.accountId,
    change.accountName,
  ];

  return texts.map(textProblem).find((problem) => problem !== null) ?? revisionProblem(change);
}

export function financialAccountChangeProblem(change: FinancialAccountChangeShape): string | null {
  const name = change.name.trim();

  if (name === '' || name.length > maximumAccountNameLength) {
    return `An account name has between 1 and ${maximumAccountNameLength} characters.`;
  }

  if (!financialAccountBanks.has(change.bank)) {
    return 'A Financial Account belongs to an enabled bank.';
  }

  return revisionProblem(change);
}
