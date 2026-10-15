import { defineCopy } from '@/features/app-shell/localization/language';
import { englishPlural, polishPlural } from '@/features/app-shell/localization/plural';

export const ignoredPaymentsCopy = defineCopy({
  pl: {
    title: 'Pomijane płatności',
    pickTitle: 'Dodaj regułę',
    close: 'Zamknij',
    back: 'Wróć',
    intro:
      'Wybrane płatności i przelewy nie trafiają do aplikacji: nie liczą się do statystyk, limitów ani widżetu i nie są synchronizowane.',
    sections: {
      payment: 'Płatności u',
      outgoingTransfer: 'Przelewy wychodzące do',
      incomingTransfer: 'Przelewy przychodzące od',
    },
    kinds: {
      payment: 'Płatność',
      outgoingTransfer: 'Przelew wychodzący',
      incomingTransfer: 'Przelew przychodzący',
    },
    emptyTitle: 'Nic nie jest pomijane',
    emptyBody: 'Dodaj regułę i wybierz z historii płatność albo przelew, który ma się nie zapisywać.',
    add: 'Dodaj regułę',
    searchPlaceholder: 'Szukaj sklepu lub osoby',
    historySection: 'Historia płatności',
    noHistory: 'W historii nie ma jeszcze płatności ani przelewów do wyboru.',
    noMatch: (query: string) => `W historii nie ma „${query}”. Możesz pominąć tę nazwę z wyprzedzeniem:`,
    typedSection: 'Pomiń nazwę',
    typedRow: (query: string) => `„${query}”`,
    candidateDetail: (kind: string, count: number, last: string) =>
      `${kind} · ${count} ${polishPlural(count, 'transakcja', 'transakcje', 'transakcji')} · ostatnio ${last}`,
    pickHint: 'Otwiera wybór, jak pominąć tę płatność',
    ruleSince: (date: string) => `Pomijane od ${date}`,
    ruleEverything: 'Pomijane razem z historią',
    ruleHint: 'Otwiera szczegóły reguły',
    historyCount: (count: number) =>
      count === 0
        ? 'Brak w historii'
        : `${count} ${polishPlural(count, 'transakcja', 'transakcje', 'transakcji')} w historii`,
    fromToday: 'Zacznij pomijać od dziś',
    fromTodayDetail: 'Historia zostaje bez zmian. Nowe transakcje nie trafią do aplikacji.',
    startSkipping: 'Zacznij pomijać',
    startSkippingDetail: 'Nowe transakcje o tej nazwie nie trafią do aplikacji.',
    deleteHistory: 'Usuń całą historię',
    deleteHistoryDetail: (count: number) =>
      `Usuniemy ${count} ${polishPlural(count, 'transakcję', 'transakcje', 'transakcji')} i będziemy pomijać kolejne.`,
    deleteArmed: 'Stuknij ponownie, aby usunąć',
    deleteArmedDetail: 'Tej operacji nie można cofnąć.',
    stop: 'Przestań pomijać',
    stopDetail: 'Nowe transakcje znowu będą się zapisywać. Wcześniej pominięte nie wrócą.',
    cancel: 'Anuluj',
    saveFailed: 'Nie udało się zapisać reguły. Spróbuj ponownie.',
    footnote: 'Reguły zostają na tym urządzeniu. Transakcje dodane ręcznie nigdy nie są pomijane.',
    detailAction: {
      payment: (name: string) => `Pomijaj płatności u „${name}”`,
      outgoingTransfer: (name: string) => `Pomijaj przelewy do „${name}”`,
      incomingTransfer: (name: string) => `Pomijaj przelewy od „${name}”`,
    },
    detailSkipping: (name: string) => `„${name}” jest pomijane`,
  },
  en: {
    title: 'Skipped payments',
    pickTitle: 'Add rule',
    close: 'Close',
    back: 'Back',
    intro:
      'Chosen payments and transfers never reach the app: they stay out of statistics, limits and the widget, and are not synced.',
    sections: {
      payment: 'Payments at',
      outgoingTransfer: 'Outgoing transfers to',
      incomingTransfer: 'Incoming transfers from',
    },
    kinds: {
      payment: 'Payment',
      outgoingTransfer: 'Outgoing transfer',
      incomingTransfer: 'Incoming transfer',
    },
    emptyTitle: 'Nothing is skipped',
    emptyBody: 'Add a rule and pick a payment or transfer from your history that should not be saved.',
    add: 'Add rule',
    searchPlaceholder: 'Search a shop or person',
    historySection: 'Payment history',
    noHistory: 'There are no payments or transfers in your history to choose from yet.',
    noMatch: (query: string) => `“${query}” is not in your history. You can skip this name in advance:`,
    typedSection: 'Skip a name',
    typedRow: (query: string) => `“${query}”`,
    candidateDetail: (kind: string, count: number, last: string) =>
      `${kind} · ${count} ${englishPlural(count, 'transaction', 'transactions')} · last ${last}`,
    pickHint: 'Opens the choice of how to skip this payment',
    ruleSince: (date: string) => `Skipped since ${date}`,
    ruleEverything: 'Skipped along with history',
    ruleHint: 'Opens the rule details',
    historyCount: (count: number) =>
      count === 0
        ? 'Not in history'
        : `${count} ${englishPlural(count, 'transaction', 'transactions')} in history`,
    fromToday: 'Start skipping from today',
    fromTodayDetail: 'Your history stays as it is. New transactions will not reach the app.',
    startSkipping: 'Start skipping',
    startSkippingDetail: 'New transactions with this name will not reach the app.',
    deleteHistory: 'Delete the whole history',
    deleteHistoryDetail: (count: number) =>
      `We will delete ${count} ${englishPlural(count, 'transaction', 'transactions')} and skip the next ones.`,
    deleteArmed: 'Tap again to delete',
    deleteArmedDetail: 'This cannot be undone.',
    stop: 'Stop skipping',
    stopDetail: 'New transactions will be saved again. Already skipped ones will not come back.',
    cancel: 'Cancel',
    saveFailed: 'Could not save the rule. Please try again.',
    footnote: 'Rules stay on this device. Manually added transactions are never skipped.',
    detailAction: {
      payment: (name: string) => `Skip payments at “${name}”`,
      outgoingTransfer: (name: string) => `Skip transfers to “${name}”`,
      incomingTransfer: (name: string) => `Skip transfers from “${name}”`,
    },
    detailSkipping: (name: string) => `“${name}” is skipped`,
  },
});
