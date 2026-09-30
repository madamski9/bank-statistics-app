import { defineCopy } from '@/features/localization/language';
import { englishPlural, polishPlural } from '@/features/localization/plural';

export const subscriptionsCopy = defineCopy({
  pl: {
    title: 'Płatności cykliczne',
    close: 'Zamknij',
    monthlyTotal: 'Miesięcznie',
    activeCount: (count: number) =>
      `${count} ${polishPlural(count, 'aktywna płatność', 'aktywne płatności', 'aktywnych płatności')}`,
    yearly: (amount: string) => `${amount} rocznie`,
    cadences: {
      weekly: 'co tydzień',
      monthly: 'co miesiąc',
      quarterly: 'co kwartał',
      yearly: 'co rok',
    },
    next: (date: string) => `następna ok. ${date}`,
    lapsed: (date: string) => `ostatnio ${date}`,
    priceIncrease: (from: string, to: string) => `Podrożało z ${from} do ${to}`,
    active: 'AKTYWNE',
    inactive: 'ZAKOŃCZONE LUB WSTRZYMANE',
    empty:
      'Nie widzimy jeszcze płatności cyklicznych. Pojawią się, gdy ta sama płatność powtórzy się kilka razy w podobnym odstępie i kwocie.',
    dismiss: 'To nie jest płatność cykliczna',
    dismissTitle: (name: string) => `Ukryć „${name}”?`,
    dismissBody: 'Nie pokażemy tej pozycji wśród płatności cyklicznych ani w prognozie.',
    restore: 'Przywróć ukryte pozycje',
    cancel: 'Anuluj',
    hide: 'Ukryj',
    footnote:
      'Wykrywamy je na tym telefonie z historii transakcji: ten sam sklep lub odbiorca, podobna kwota i regularny odstęp.',
  },
  en: {
    title: 'Recurring payments',
    close: 'Close',
    monthlyTotal: 'Per month',
    activeCount: (count: number) => `${count} active ${englishPlural(count, 'payment', 'payments')}`,
    yearly: (amount: string) => `${amount} a year`,
    cadences: {
      weekly: 'weekly',
      monthly: 'monthly',
      quarterly: 'quarterly',
      yearly: 'yearly',
    },
    next: (date: string) => `next around ${date}`,
    lapsed: (date: string) => `last on ${date}`,
    priceIncrease: (from: string, to: string) => `Went up from ${from} to ${to}`,
    active: 'ACTIVE',
    inactive: 'ENDED OR PAUSED',
    empty:
      'No recurring payments yet. They appear once the same payment repeats a few times at a similar interval and amount.',
    dismiss: 'This is not a recurring payment',
    dismissTitle: (name: string) => `Hide “${name}”?`,
    dismissBody: 'It will no longer appear among recurring payments or in the forecast.',
    restore: 'Show hidden items again',
    cancel: 'Cancel',
    hide: 'Hide',
    footnote:
      'Detected on this phone from your history: the same shop or recipient, a similar amount and a regular interval.',
  },
});
