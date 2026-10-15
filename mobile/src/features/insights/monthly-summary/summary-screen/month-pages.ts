import type { IngestionRecord } from '@bankstats/ingestion-native';

import {
  compareMonths,
  monthKey,
  summarizeMonth,
  type MonthComparison,
  type MonthlySummary,
  type SummaryMonth,
} from '../monthly-summary';

export type BreakdownDimension = 'merchant' | 'category';

export interface MonthPageData {
  offset: -1 | 0 | 1;
  month: SummaryMonth;
  summary: MonthlySummary;
  comparedMonths: MonthComparison[];
}

type CachedPage = Omit<MonthPageData, 'offset'>;

export type SummaryOptions = Parameters<typeof summarizeMonth>[2];

interface PageCacheEntry {
  options: SummaryOptions;
  page: CachedPage;
}

const pageCache = new WeakMap<IngestionRecord[], Map<string, PageCacheEntry>>();

export function cachedPage(records: IngestionRecord[], month: SummaryMonth, options: SummaryOptions): CachedPage {
  const byMonth = pageCache.get(records) ?? new Map<string, PageCacheEntry>();
  const key = monthKey(month);
  const cached = byMonth.get(key);

  pageCache.set(records, byMonth);

  if (
    cached !== undefined &&
    cached.options.rules === options.rules &&
    cached.options.events === options.events &&
    cached.options.recurring === options.recurring &&
    cached.options.now === options.now
  ) {
    return cached.page;
  }

  const page = {
    month,
    summary: summarizeMonth(records, month, options),
    comparedMonths: compareMonths(records, month, options.now),
  };

  byMonth.set(key, { options, page });

  return page;
}
