import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalMutation, internalQuery } from './_generated/server';
import { requireOwnerId } from './owner';

const rateRequest = v.object({ currency: v.string(), date: v.string() });

const maximumRequests = 60;
const currencyPattern = /^[A-Z]{3}$/;
const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const dayMs = 86_400_000;
const lookbackDays = { A: 10, B: 21 } as const;
const nbpEndpoint = 'https://api.nbp.pl/api/exchangerates/rates';

type NbpTable = keyof typeof lookbackDays;

export interface ExchangeRateSnapshot {
  currency: string;
  requestedDate: string;
  effectiveDate: string;
  mid: string;
  table: string;
}

interface NbpRate {
  no: string;
  effectiveDate: string;
  mid: number;
}

function isCalendarDate(value: string): boolean {
  return calendarDatePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function shiftedDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);
}

export function warsawToday(now: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date(now));
}

export function latestRateOnOrBefore(rates: NbpRate[], date: string): NbpRate | null {
  return rates
    .filter((rate) => rate.effectiveDate <= date)
    .reduce<NbpRate | null>(
      (latest, rate) => (latest === null || rate.effectiveDate > latest.effectiveDate ? rate : latest),
      null,
    );
}

async function fetchNbpRate(currency: string, date: string, table: NbpTable): Promise<NbpRate | null> {
  const from = shiftedDate(date, -lookbackDays[table]);
  const response = await fetch(
    `${nbpEndpoint}/${table}/${currency}/${from}/${date}/?format=json`,
    { headers: { Accept: 'application/json' } },
  );

  if (response.status === 404 || response.status === 400) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`NBP responded with ${response.status}`);
  }

  const body = (await response.json()) as { rates?: NbpRate[] };

  return latestRateOnOrBefore(body.rates ?? [], date);
}

export const cached = internalQuery({
  args: { requests: v.array(rateRequest) },
  handler: async (ctx, { requests }) => {
    const found: ExchangeRateSnapshot[] = [];

    for (const request of requests) {
      const row = await ctx.db
        .query('exchangeRates')
        .withIndex('by_currency_date', (index) =>
          index.eq('currency', request.currency).eq('requestedDate', request.date),
        )
        .first();

      if (row !== null) {
        found.push({
          currency: row.currency,
          requestedDate: row.requestedDate,
          effectiveDate: row.effectiveDate,
          mid: row.mid,
          table: row.table,
        });
      }
    }

    return found;
  },
});

export const store = internalMutation({
  args: {
    snapshot: v.object({
      currency: v.string(),
      requestedDate: v.string(),
      effectiveDate: v.string(),
      mid: v.string(),
      table: v.string(),
    }),
  },
  handler: async (ctx, { snapshot }) => {
    const existing = await ctx.db
      .query('exchangeRates')
      .withIndex('by_currency_date', (index) =>
        index.eq('currency', snapshot.currency).eq('requestedDate', snapshot.requestedDate),
      )
      .first();

    if (existing === null) {
      await ctx.db.insert('exchangeRates', { ...snapshot, fetchedAt: Date.now() });
    }
  },
});

export const snapshots = action({
  args: { requests: v.array(rateRequest) },
  handler: async (ctx, { requests }): Promise<ExchangeRateSnapshot[]> => {
    const ownerId = await requireOwnerId(ctx.auth);

    if (requests.length > maximumRequests) {
      throw new ConvexError(`Ask for at most ${maximumRequests} rates at once.`);
    }

    const today = warsawToday(Date.now());
    const unique = [
      ...new Map(
        requests
          .filter(
            (request) =>
              currencyPattern.test(request.currency) &&
              request.currency !== 'PLN' &&
              isCalendarDate(request.date) &&
              request.date <= today,
          )
          .map((request) => [`${request.currency}:${request.date}`, request]),
      ).values(),
    ];
    const found: ExchangeRateSnapshot[] = await ctx.runQuery(internal.exchangeRates.cached, {
      requests: unique,
    });
    const foundKeys = new Set(found.map((snapshot) => `${snapshot.currency}:${snapshot.requestedDate}`));

    const missing = unique.filter((request) => !foundKeys.has(`${request.currency}:${request.date}`));
    const granted =
      missing.length === 0
        ? 0
        : await ctx.runMutation(internal.owners.spendRateLookups, { ownerId, requested: missing.length });

    for (const request of missing.slice(0, granted)) {

      let rate: NbpRate | null = null;
      let table: NbpTable = 'A';

      try {
        rate = await fetchNbpRate(request.currency, request.date, 'A');

        if (rate === null) {
          table = 'B';
          rate = await fetchNbpRate(request.currency, request.date, 'B');
        }
      } catch {
        continue;
      }

      if (rate === null) {
        continue;
      }

      const snapshot: ExchangeRateSnapshot = {
        currency: request.currency,
        requestedDate: request.date,
        effectiveDate: rate.effectiveDate,
        mid: String(rate.mid),
        table: rate.no || table,
      };

      if (rate.effectiveDate === request.date || request.date < today) {
        await ctx.runMutation(internal.exchangeRates.store, { snapshot });
      }

      found.push(snapshot);
    }

    return found;
  },
});
