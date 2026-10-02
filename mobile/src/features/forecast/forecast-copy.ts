import { defineCopy } from '@/features/localization/language';
import { englishPlural, polishPlural } from '@/features/localization/plural';

export const forecastCopy = defineCopy({
  pl: {
    title: (month: string) => `Prognoza na ${month}`,
    done: 'Gotowe',
    projected: 'Szacowane wydatki',
    spent: 'Wydane dotąd',
    left: 'Do końca miesiąca',
    daysLeft: (days: number) =>
      days === 0 ? 'ostatni dzień' : `${days} ${polishPlural(days, 'dzień', 'dni', 'dni')}`,
    pace: 'Tempo',
    perDay: (amount: string) => `${amount} dziennie`,
    versus: (change: string, isUp: boolean, month: string) =>
      `${isUp ? '▲' : '▼'} ${change} względem ${month}`,
    upcoming: 'Nadchodzące płatności cykliczne',
    upcomingValue: (amount: string, count: number) =>
      `${amount} · ${count} ${polishPlural(count, 'płatność', 'płatności', 'płatności')}`,
    limit: 'Limit miesięczny',
    limitExceeded: (target: string) => `Limit ${target} jest już przekroczony.`,
    limitCrossing: (target: string, date: string) => `W tym tempie przekroczysz limit ${target} ok. ${date}.`,
    limitOver: (target: string) => `W tym tempie skończysz miesiąc powyżej limitu ${target}.`,
    limitSafe: (target: string) => `W tym tempie zmieścisz się w limicie ${target}.`,
    early: 'Wstępna: miesiąc dopiero się zaczął.',
    pendingConversion: (count: number) =>
      `${count} ${polishPlural(count, 'transakcja czeka', 'transakcje czekają', 'transakcji czeka')} na kurs NBP i na razie nie wlicza się do sum.`,
    explanation:
      'Prognoza łączy Twoje dotychczasowe tempo wydatków z płatnościami cyklicznymi, które jeszcze przed Tobą w tym miesiącu.',
  },
  en: {
    title: (month: string) => `${month} forecast`,
    done: 'Done',
    projected: 'Projected spending',
    spent: 'Spent so far',
    left: 'Left this month',
    daysLeft: (days: number) => (days === 0 ? 'last day' : `${days} ${englishPlural(days, 'day', 'days')}`),
    pace: 'Pace',
    perDay: (amount: string) => `${amount} a day`,
    versus: (change: string, isUp: boolean, month: string) =>
      `${isUp ? '▲' : '▼'} ${change} compared with ${month}`,
    upcoming: 'Upcoming recurring payments',
    upcomingValue: (amount: string, count: number) =>
      `${amount} · ${count} ${englishPlural(count, 'payment', 'payments')}`,
    limit: 'Monthly limit',
    limitExceeded: (target: string) => `The ${target} limit is already exceeded.`,
    limitCrossing: (target: string, date: string) => `At this pace you will pass the ${target} limit around ${date}.`,
    limitOver: (target: string) => `At this pace you will end the month above the ${target} limit.`,
    limitSafe: (target: string) => `At this pace you will stay within the ${target} limit.`,
    early: 'Early estimate: the month has only just started.',
    pendingConversion: (count: number) =>
      `${count} ${englishPlural(count, 'transaction is', 'transactions are')} waiting for the NBP rate and not counted in totals yet.`,
    explanation:
      'The forecast combines your spending pace so far with the recurring payments still ahead of you this month.',
  },
});
