import { defineCopy } from '@/features/localization/language';
import { englishPlural, polishPlural } from '@/features/localization/plural';

export const insightsCopy = defineCopy({
  pl: {
    forecastTitle: (month: string) => `Prognoza na ${month}`,
    forecastSpent: (spent: string, days: number) =>
      `Wydane ${spent} · ${days === 0 ? 'ostatni dzień' : `zostało ${days} ${polishPlural(days, 'dzień', 'dni', 'dni')}`}`,
    forecastEarly: 'Wstępna: miesiąc dopiero się zaczął.',
    forecastRecurring: (amount: string, count: number) =>
      `W tym ${amount} z ${count} ${polishPlural(count, 'nadchodzącej płatności cyklicznej', 'nadchodzących płatności cyklicznych', 'nadchodzących płatności cyklicznych')}.`,
    forecastVersus: (change: string, isUp: boolean, month: string) =>
      `${isUp ? '▲' : '▼'} ${change} względem ${month}`,
    forecastPace: (amount: string) => `Tempo: ${amount} dziennie`,
    limitExceeded: (target: string) => `Limit ${target} jest już przekroczony.`,
    limitCrossing: (target: string, date: string) => `W tym tempie przekroczysz limit ${target} ok. ${date}.`,
    limitOver: (target: string) => `W tym tempie skończysz miesiąc powyżej limitu ${target}.`,
    limitSafe: (target: string) => `W tym tempie zmieścisz się w limicie ${target}.`,
    forecastLabel: (projected: string, spent: string) => `Prognoza wydatków ${projected}, wydane dotąd ${spent}`,
    eventTitle: 'Wydarzenie',
    eventActive: (since: string) => `Trwa od ${since}`,
    eventSpent: (amount: string, perDay: string) => `${amount} · ${perDay} dziennie`,
    eventIdle:
      'Wyjazd, remont albo przyjęcie? Rozpocznij wydarzenie, a każda nowa transakcja trafi do jego zestawienia.',
    startEvent: 'Rozpocznij wydarzenie',
    endEvent: 'Zakończ',
    eventDetails: 'Szczegóły',
    allEvents: (count: number) => `Wszystkie wydarzenia (${count})`,
    startTitle: 'Nowe wydarzenie',
    startMessage: 'Od teraz nowe transakcje trafią do tego wydarzenia, aż je zakończysz.',
    namePlaceholder: 'np. Wakacje w Chorwacji',
    cancel: 'Anuluj',
    recurringTitle: 'Płatności cykliczne',
    recurringTotal: (amount: string, count: number) =>
      `${amount} miesięcznie · ${count} ${polishPlural(count, 'aktywna', 'aktywne', 'aktywnych')}`,
    recurringEmpty: 'Pojawią się, gdy wykryjemy regularne płatności, np. subskrypcje albo czynsz.',
    recurringNext: (date: string) => `ok. ${date}`,
    recurringIncrease: 'podrożało',
    showAll: 'Pokaż wszystkie',
    summaryTitle: (month: string) => `${month} w skrócie`,
    summarySpent: (amount: string) => `Wydatki ${amount}`,
    summaryOpen: 'Otwórz podsumowanie',
    summaryEmpty: 'Podsumowanie pojawi się po pierwszym pełnym miesiącu z transakcjami.',
    pendingConversion: (count: number) =>
      `${count} ${polishPlural(count, 'transakcja czeka', 'transakcje czekają', 'transakcji czeka')} na kurs NBP i na razie nie wlicza się do sum.`,
  },
  en: {
    forecastTitle: (month: string) => `${month} forecast`,
    forecastSpent: (spent: string, days: number) =>
      `Spent ${spent} · ${days === 0 ? 'last day' : `${days} ${englishPlural(days, 'day', 'days')} left`}`,
    forecastEarly: 'Early estimate: the month has only just started.',
    forecastRecurring: (amount: string, count: number) =>
      `Includes ${amount} from ${count} upcoming recurring ${englishPlural(count, 'payment', 'payments')}.`,
    forecastVersus: (change: string, isUp: boolean, month: string) =>
      `${isUp ? '▲' : '▼'} ${change} compared with ${month}`,
    forecastPace: (amount: string) => `Pace: ${amount} a day`,
    limitExceeded: (target: string) => `The ${target} limit is already exceeded.`,
    limitCrossing: (target: string, date: string) => `At this pace you will pass the ${target} limit around ${date}.`,
    limitOver: (target: string) => `At this pace you will end the month above the ${target} limit.`,
    limitSafe: (target: string) => `At this pace you will stay within the ${target} limit.`,
    forecastLabel: (projected: string, spent: string) => `Spending forecast ${projected}, spent so far ${spent}`,
    eventTitle: 'Event',
    eventActive: (since: string) => `Ongoing since ${since}`,
    eventSpent: (amount: string, perDay: string) => `${amount} · ${perDay} a day`,
    eventIdle: 'A trip, a renovation or a party? Start an event and every new transaction joins its summary.',
    startEvent: 'Start an event',
    endEvent: 'End',
    eventDetails: 'Details',
    allEvents: (count: number) => `All events (${count})`,
    startTitle: 'New event',
    startMessage: 'From now on new transactions join this event until you end it.',
    namePlaceholder: 'e.g. Holiday in Croatia',
    cancel: 'Cancel',
    recurringTitle: 'Recurring payments',
    recurringTotal: (amount: string, count: number) => `${amount} a month · ${count} active`,
    recurringEmpty: 'They appear once we spot regular payments such as subscriptions or rent.',
    recurringNext: (date: string) => `around ${date}`,
    recurringIncrease: 'went up',
    showAll: 'Show all',
    summaryTitle: (month: string) => `${month} at a glance`,
    summarySpent: (amount: string) => `Spending ${amount}`,
    summaryOpen: 'Open the summary',
    summaryEmpty: 'The summary appears after the first full month with transactions.',
    pendingConversion: (count: number) =>
      `${count} ${englishPlural(count, 'transaction is', 'transactions are')} waiting for the NBP rate and not counted in totals yet.`,
  },
});
