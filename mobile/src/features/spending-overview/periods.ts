import { calendarCopy } from '@/features/localization/calendar-copy';
import { currentCopy, defineCopy } from '@/features/localization/language';

export type SpendingPeriod = 'currentMonth' | 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface PeriodWindow {
  /** Inclusive lower bound in epoch milliseconds, or null for "everything captured so far". */
  startMs: number | null;
  /** Exclusive upper bound in epoch milliseconds. */
  endMs: number;
}

export interface PeriodOption {
  value: SpendingPeriod;
  /** Compact label for the range switcher. */
  short: string;
  /** Sentence-case description of the window. */
  label: string;
  /** Description of the window the current one is compared against. */
  previousLabel: string;
}

const dayMs = 86_400_000;

const spanInDays: Record<Exclude<SpendingPeriod, 'all' | 'currentMonth'>, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

const periodCopy = defineCopy<PeriodOption[]>({
  pl: [
    { value: 'currentMonth', short: '', label: 'ten miesiąc', previousLabel: 'poprzedni miesiąc do tego dnia' },
    { value: 'week', short: '1T', label: 'ostatnie 7 dni', previousLabel: 'poprzednie 7 dni' },
    { value: 'month', short: '1M', label: 'ostatnie 30 dni', previousLabel: 'poprzednie 30 dni' },
    { value: 'quarter', short: '3M', label: 'ostatnie 90 dni', previousLabel: 'poprzednie 90 dni' },
    { value: 'year', short: '1R', label: 'ostatni rok', previousLabel: 'poprzedni rok' },
    { value: 'all', short: 'Max', label: 'od początku', previousLabel: 'brak porównania' },
  ],
  en: [
    { value: 'currentMonth', short: '', label: 'this month', previousLabel: 'last month to date' },
    { value: 'week', short: '1W', label: 'last 7 days', previousLabel: 'previous 7 days' },
    { value: 'month', short: '1M', label: 'last 30 days', previousLabel: 'previous 30 days' },
    { value: 'quarter', short: '3M', label: 'last 90 days', previousLabel: 'previous 90 days' },
    { value: 'year', short: '1Y', label: 'last year', previousLabel: 'previous year' },
    { value: 'all', short: 'Max', label: 'all time', previousLabel: 'no comparison' },
  ],
});

function currentMonthShort(reference: Date): string {
  return (currentCopy(calendarCopy).monthNames[reference.getMonth()] ?? '').slice(0, 3);
}

export function periodOptions(reference: Date = new Date()): PeriodOption[] {
  return currentCopy(periodCopy).map((option) =>
    option.value === 'currentMonth' ? { ...option, short: currentMonthShort(reference) } : option,
  );
}

function monthStartMs(reference: Date, offset = 0): number {
  return new Date(reference.getFullYear(), reference.getMonth() + offset, 1).getTime();
}

export function periodOption(period: SpendingPeriod): PeriodOption {
  const options = periodOptions();

  return options.find((option) => option.value === period) ?? options[0];
}

export function periodLabel(period: SpendingPeriod): string {
  return periodOption(period).label;
}

export function periodWindow(period: SpendingPeriod, reference: Date = new Date()): PeriodWindow {
  const endMs = reference.getTime();

  if (period === 'all') {
    return { startMs: null, endMs };
  }

  if (period === 'currentMonth') {
    return { startMs: monthStartMs(reference), endMs };
  }

  return { startMs: endMs - spanInDays[period] * dayMs, endMs };
}

/** The equally long window immediately before the current one, or null when there is none. */
export function previousPeriodWindow(
  period: SpendingPeriod,
  reference: Date = new Date(),
): PeriodWindow | null {
  if (period === 'all') {
    return null;
  }

  if (period === 'currentMonth') {
    const startMs = monthStartMs(reference, -1);
    const thisMonthStartMs = monthStartMs(reference);
    const lastPreviousDay = new Date(reference.getFullYear(), reference.getMonth(), 0).getDate();
    const endMs = reference.getDate() > lastPreviousDay
      ? thisMonthStartMs
      : new Date(
          reference.getFullYear(),
          reference.getMonth() - 1,
          reference.getDate(),
          reference.getHours(),
          reference.getMinutes(),
          reference.getSeconds(),
          reference.getMilliseconds(),
        ).getTime();

    return { startMs, endMs };
  }

  const current = periodWindow(period, reference);
  const span = spanInDays[period] * dayMs;

  return { startMs: (current.startMs ?? current.endMs) - span, endMs: current.endMs - span };
}

export function isWithinWindow(occurredAt: string, window: PeriodWindow): boolean {
  const occurredMs = new Date(occurredAt).getTime();

  if (Number.isNaN(occurredMs) || occurredMs >= window.endMs) {
    return false;
  }

  return window.startMs === null || occurredMs >= window.startMs;
}

/** Days the window actually covers, used for per-day averages. */
export function windowDays(window: PeriodWindow, earliestMs: number | null): number {
  const startMs = window.startMs ?? earliestMs ?? window.endMs;

  return Math.max(1, Math.round((window.endMs - startMs) / dayMs));
}
