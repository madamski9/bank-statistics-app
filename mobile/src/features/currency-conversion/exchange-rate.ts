import type { IngestionRecord } from '@bankstats/ingestion-native';

export const reportingCurrency = 'PLN';

export interface ExchangeRateSnapshot {
  currency: string;
  requestedDate: string;
  effectiveDate: string;
  mid: string;
  table: string;
}

export interface RateRequest {
  currency: string;
  date: string;
}

const decimalPattern = /^(\d+)(?:\.(\d+))?$/;
let warsawDate: Intl.DateTimeFormat | null = null;

function warsawDateFormat(): Intl.DateTimeFormat {
  warsawDate ??= new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' });

  return warsawDate;
}

export function reportingAmountMinor(amountMinor: number, mid: string): number | null {
  const match = decimalPattern.exec(mid);

  if (match === null || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return null;
  }

  const fraction = match[2] ?? '';
  const scale = 10n ** BigInt(fraction.length);
  const rate = BigInt(`${match[1]}${fraction}`);
  const converted = (BigInt(amountMinor) * rate * 2n + scale) / (2n * scale);
  const result = Number(converted);

  return Number.isSafeInteger(result) && result > 0 ? result : null;
}

export function occurrenceDate(record: Pick<IngestionRecord, 'occurredAt'>): string | null {
  const occurred = new Date(record.occurredAt);

  return Number.isNaN(occurred.getTime()) ? null : warsawDateFormat().format(occurred);
}

export function needsConversion(record: IngestionRecord): boolean {
  return record.currency !== reportingCurrency && record.reportingAmountMinor === undefined;
}

export function conversionRequest(record: IngestionRecord): RateRequest | null {
  const date = occurrenceDate(record);

  return date === null || !needsConversion(record) ? null : { currency: record.currency, date };
}

export function pendingRateRequests(records: IngestionRecord[], limit: number): RateRequest[] {
  const unique = new Map<string, RateRequest>();

  for (const record of records) {
    const request = conversionRequest(record);

    if (request !== null) {
      unique.set(`${request.currency}:${request.date}`, request);
    }
  }

  return [...unique.values()].slice(0, limit);
}

export function withExchangeRate(
  record: IngestionRecord,
  snapshot: ExchangeRateSnapshot,
): IngestionRecord | null {
  const converted = reportingAmountMinor(record.amountMinor, snapshot.mid);

  if (converted === null) {
    return null;
  }

  return {
    ...record,
    reportingAmountMinor: converted,
    exchangeRate: snapshot.mid,
    exchangeRateDate: snapshot.effectiveDate,
    exchangeRateTable: snapshot.table,
  };
}

export function convertedRecords(
  records: IngestionRecord[],
  snapshots: ExchangeRateSnapshot[],
): IngestionRecord[] {
  const byKey = new Map(snapshots.map((snapshot) => [`${snapshot.currency}:${snapshot.requestedDate}`, snapshot]));
  const converted: IngestionRecord[] = [];

  for (const record of records) {
    const request = conversionRequest(record);
    const snapshot = request === null ? undefined : byKey.get(`${request.currency}:${request.date}`);
    const updated = snapshot === undefined ? null : withExchangeRate(record, snapshot);

    if (updated !== null) {
      converted.push(updated);
    }
  }

  return converted;
}

export function withoutExchangeRate(record: IngestionRecord): IngestionRecord {
  const {
    reportingAmountMinor: _amount,
    exchangeRate: _rate,
    exchangeRateDate: _date,
    exchangeRateTable: _table,
    ...rest
  } = record;

  return rest;
}

export function inReportingCurrency(record: IngestionRecord): IngestionRecord | null {
  if (record.currency === reportingCurrency) {
    return record;
  }

  if (record.reportingAmountMinor === undefined) {
    return null;
  }

  return { ...record, amountMinor: record.reportingAmountMinor, currency: reportingCurrency };
}
