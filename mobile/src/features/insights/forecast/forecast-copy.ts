import { defineCopy } from '@/features/app-shell/localization/language';
import { englishPlural, polishPlural } from '@/features/app-shell/localization/plural';

export const forecastCopy = defineCopy({
  pl: {
    title: (month: string) => `Prognoza na ${month}`,
    done: 'Gotowe',
    projected: 'Szacowane wydatki',
    spent: 'Wydane dotąd',
    left: 'Do końca miesiąca',
    daysLeft: (days: number) =>
      days === 0 ? 'ostatni dzień' : `${days} ${polishPlural(days, 'dzień', 'dni', 'dni')}`,
    expectedMore: 'Szacowane pozostałe wydatki',
    versus: (change: string, isUp: boolean, month: string) =>
      `${isUp ? '▲' : '▼'} ${change} względem ${month}`,
    upcoming: 'Nadchodzące płatności cykliczne',
    upcomingValue: (amount: string, count: number) =>
      `${amount} · ${count} ${polishPlural(count, 'płatność', 'płatności', 'płatności')}`,
    limit: 'Limit miesięczny',
    limitExceeded: (target: string) => `Limit ${target} jest już przekroczony.`,
    limitCrossing: (target: string, date: string) => `Według prognozy przekroczysz limit ${target} ok. ${date}.`,
    limitOver: (target: string) => `Według prognozy skończysz miesiąc powyżej limitu ${target}.`,
    limitSafe: (target: string) => `Według prognozy zmieścisz się w limicie ${target}.`,
    early: 'Wstępna: miesiąc dopiero się zaczął.',
    pendingConversion: (count: number) =>
      `${count} ${polishPlural(count, 'transakcja czeka', 'transakcje czekają', 'transakcji czeka')} na kurs NBP i na razie nie wlicza się do sum.`,
    explanation: (months: number) => months > 0
      ? `Prognoza łączy obecny miesiąc z analogicznym okresem ${months === 1 ? 'wcześniejszego miesiąca' : `${months} wcześniejszych miesięcy`}. Ogranicza wpływ pojedynczych dużych zakupów i dodaje przyszłe płatności cykliczne osobno.`
      : 'Brak pełnej historii miesięcy. Prognoza ogranicza wpływ pojedynczych dużych zakupów i dodaje przyszłe płatności cykliczne osobno.',
  },
  en: {
    title: (month: string) => `${month} forecast`,
    done: 'Done',
    projected: 'Projected spending',
    spent: 'Spent so far',
    left: 'Left this month',
    daysLeft: (days: number) => (days === 0 ? 'last day' : `${days} ${englishPlural(days, 'day', 'days')}`),
    expectedMore: 'Estimated remaining spending',
    versus: (change: string, isUp: boolean, month: string) =>
      `${isUp ? '▲' : '▼'} ${change} compared with ${month}`,
    upcoming: 'Upcoming recurring payments',
    upcomingValue: (amount: string, count: number) =>
      `${amount} · ${count} ${englishPlural(count, 'payment', 'payments')}`,
    limit: 'Monthly limit',
    limitExceeded: (target: string) => `The ${target} limit is already exceeded.`,
    limitCrossing: (target: string, date: string) => `The forecast puts you over the ${target} limit around ${date}.`,
    limitOver: (target: string) => `The forecast puts you over the ${target} limit by month-end.`,
    limitSafe: (target: string) => `The forecast keeps you within the ${target} limit.`,
    early: 'Early estimate: the month has only just started.',
    pendingConversion: (count: number) =>
      `${count} ${englishPlural(count, 'transaction is', 'transactions are')} waiting for the NBP rate and not counted in totals yet.`,
    explanation: (months: number) => months > 0
      ? `The forecast combines this month with the same part of ${months === 1 ? 'an earlier month' : `${months} earlier months`}. It limits the impact of single large purchases and adds upcoming recurring payments separately.`
      : 'There is no full monthly history yet. The forecast limits the impact of single large purchases and adds upcoming recurring payments separately.',
  },
});
