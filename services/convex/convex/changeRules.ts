export const maximumChangesPerPush = 500;
export const maximumTextLength = 200;
export const maximumAccountNameLength = 60;
export const maximumCategoryNameLength = 40;
export const maximumEventNameLength = 60;

const captureBanks = new Set(['millennium', 'pko', 'erste']);
const financialAccountBanks = new Set(['manual', 'millennium', 'pko', 'erste']);
const currencyPattern = /^[A-Z]{3}$/;
const customCategoryIdPattern = /^category-[a-z0-9-]{1,60}$/;
const decimalRatePattern = /^\d{1,6}(?:\.\d{1,8})?$/;
const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const eventColorPattern = /^[a-z]{1,20}$/;
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
  eventId?: string;
  reportingAmountMinor?: number;
  exchangeRate?: string;
  exchangeRateDate?: string;
  exchangeRateTable?: string;
  occurredAt: string;
  capturedAt: string;
}

interface FinancialAccountChangeShape extends RevisionedChange {
  bank: string;
  name: string;
}

interface CategoryChangeShape extends RevisionedChange {
  name: string;
}

interface EventChangeShape extends RevisionedChange {
  name: string;
  startedAt: string;
  endedAt?: string;
  color?: string;
}

function isIsoTimestamp(value: string): boolean {
  return isoTimestampPattern.test(value) && !Number.isNaN(Date.parse(value));
}

export function textProblem(value: string | undefined): string | null {
  return value !== undefined && value.length > maximumTextLength
    ? `A text field has at most ${maximumTextLength} characters.`
    : null;
}

export function revisionProblem(change: RevisionedChange): string | null {
  if (!Number.isSafeInteger(change.revision) || change.revision < 0) {
    return 'A revision is a non-negative whole number.';
  }

  return textProblem(change.clientId);
}

export function transactionChangeProblem(change: TransactionChangeShape): string | null {
  if (change.origin === 'capture' && !captureBanks.has(change.bank)) {
    return 'Only enabled banks can synchronize captured transactions.';
  }

  if (change.origin === 'manual' && change.bank !== 'manual') {
    return 'A manual transaction belongs to the manual bank.';
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

  if (
    change.reportingAmountMinor !== undefined &&
    (!Number.isSafeInteger(change.reportingAmountMinor) || change.reportingAmountMinor <= 0)
  ) {
    return 'A reporting amount is a positive whole number of minor units.';
  }

  if (change.exchangeRate !== undefined && !decimalRatePattern.test(change.exchangeRate)) {
    return 'An exchange rate is a decimal number.';
  }

  if (change.exchangeRateDate !== undefined && !calendarDatePattern.test(change.exchangeRateDate)) {
    return 'An exchange rate date is a calendar date.';
  }

  const texts = [
    change.bank,
    change.merchant,
    change.category,
    change.sourceApp,
    change.accountId,
    change.accountName,
    change.eventId,
    change.exchangeRateTable,
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

export function categoryChangeProblem(change: CategoryChangeShape): string | null {
  const name = change.name.trim();

  if (name === '' || name.length > maximumCategoryNameLength) {
    return `A category name has between 1 and ${maximumCategoryNameLength} characters.`;
  }

  if (!customCategoryIdPattern.test(change.clientId)) {
    return 'A custom category has a category- identifier.';
  }

  return revisionProblem(change);
}

export function eventChangeProblem(change: EventChangeShape): string | null {
  const name = change.name.trim();

  if (name === '' || name.length > maximumEventNameLength) {
    return `An event name has between 1 and ${maximumEventNameLength} characters.`;
  }

  if (!isIsoTimestamp(change.startedAt) || (change.endedAt !== undefined && !isIsoTimestamp(change.endedAt))) {
    return 'An event starts and ends at ISO 8601 timestamps.';
  }

  if (change.endedAt !== undefined && Date.parse(change.endedAt) < Date.parse(change.startedAt)) {
    return 'An event cannot end before it starts.';
  }

  if (change.color !== undefined && !eventColorPattern.test(change.color)) {
    return 'An event colour is a short lowercase name.';
  }

  return revisionProblem(change);
}
