import { defineCopy } from '@/features/app-shell/localization/language';

import type { AlertMetric } from './rules/alert-rule';

export type ScopeKind = 'merchant' | 'counterparty' | 'category' | 'all';

export interface ScopeName {
  kind: ScopeKind;
  name: string;
}

const polishSubjects: Record<AlertMetric, string> = {
  expense: 'limitu',
  income: 'celu przychodów',
  netFlow: 'progu bilansu',
};

const polishSubjectsReached: Record<AlertMetric, string> = {
  expense: 'Limit',
  income: 'Cel przychodów',
  netFlow: 'Próg bilansu',
};

function polishScope(scope: ScopeName, metric: AlertMetric): string {
  switch (scope.kind) {
    case 'merchant':
      return ` w ${scope.name}`;
    case 'counterparty':
      return ` dla ${scope.name}`;
    case 'category':
      return ` w kategorii ${scope.name}`;
    case 'all':
      return metric === 'expense' ? ' wydatków' : '';
  }
}

const englishSubjects: Record<AlertMetric, string> = {
  expense: 'limit',
  income: 'income goal',
  netFlow: 'net flow threshold',
};

function englishScope(scope: ScopeName): string {
  switch (scope.kind) {
    case 'merchant':
      return ` at ${scope.name}`;
    case 'counterparty':
      return ` for ${scope.name}`;
    case 'category':
      return ` in ${scope.name}`;
    case 'all':
      return '';
  }
}

function englishSubject(metric: AlertMetric, scope: ScopeName): string {
  if (metric === 'expense' && scope.kind === 'all') {
    return 'spending limit';
  }

  return `${englishSubjects[metric]}${englishScope(scope)}`;
}

export const alertsCopy = defineCopy({
  pl: {
    periods: { week: 'w tym tygodniu', month: 'w tym miesiącu', year: 'w tym roku', custom: 'w wybranym okresie' },
    allSpending: 'wszystkie wydatki',
    metrics: { expense: 'Wydatki', income: 'Przychody', netFlow: 'Bilans' },
    missingIncomeTitle: 'Brak spodziewanego wpływu',
    missingIncomeBody: (period: string, reached: string, target: string) =>
      `Wpływy ${period}: ${reached} z oczekiwanych ${target}.`,
    reachedTitle: (metric: AlertMetric, scope: ScopeName) =>
      `${polishSubjectsReached[metric]}${polishScope(scope, metric)} osiągnięty`,
    reachedBody: (metric: AlertMetric, noun: string, period: string, reached: string, target: string) =>
      `${noun} ${period}: ${reached} przy ${metric === 'expense' ? 'limicie' : 'progu'} ${target}.`,
    nearTitle: (metric: AlertMetric, scope: ScopeName) => `Blisko ${polishSubjects[metric]}${polishScope(scope, metric)}`,
    nearBody: (noun: string, period: string, reached: string, target: string, remaining: string) =>
      `${noun} ${period}: ${reached} z ${target}. Zostało ${remaining}.`,
    frequency: { week: 'tygodniowo', month: 'miesięcznie', year: 'rocznie', custom: 'w wybranym okresie' },
    limitPeriods: { week: 'tygodniowy', month: 'miesięczny', year: 'roczny', custom: 'w wybranym okresie' },
    title: 'Limity i alerty',
    done: 'Gotowe',
    empty: 'Nie masz jeszcze żadnego limitu. Ustaw kwotę na miesiąc, a damy znać, zanim ją osiągniesz.',
    editHint: 'Otwiera ustawienia limitu',
    disabled: ' · wyłączony',
    add: 'Dodaj limit',
    periodNames: { week: 'Tydzień', month: 'Miesiąc', year: 'Rok' },
    enterAmount: 'Podaj kwotę większą od zera.',
    permissionDenied:
      'Bez zgody na powiadomienia nie damy znać o progu. Możesz ją włączyć w Ustawieniach systemu.',
    cancel: 'Anuluj',
    newLimit: 'Nowy limit',
    limit: 'Limit',
    save: 'Zapisz',
    scopeSection: 'Zakres limitu',
    searchShop: 'Szukaj sklepu',
    searchPlaceholder: 'Szukaj w historii transakcji',
    scopeLists: { merchant: 'Sklepy', category: 'Kategorie' },
    searchCategory: 'Szukaj kategorii',
    selectedScope: (label: string) => `Wybrano: ${label}`,
    deletedCategory: 'Usunięta kategoria',
    existingLimitTitle: 'Ten zakres ma już limit',
    existingLimitBody: (label: string) => `${label} ma już swój limit. Otwórz go, żeby zmienić kwotę albo okres.`,
    openExistingLimit: 'Otwórz limit',
    allSpendingOption: 'Wszystkie wydatki',
    amount: 'Kwota limitu',
    amountPlaceholder: '0,00',
    decimalSeparator: ',',
    period: 'Okres limitu',
    missingIncomeHint: 'Damy znać po zakończeniu okresu, jeśli wpływ nie nadejdzie.',
    missingIncomeLabel: 'Ostrzeż, gdy wpływ nie nadejdzie',
    notificationsLabel: 'Powiadomienia',
    notificationsOn: 'Powiadomienia',
    notificationsOff: 'Bez powiadomień',
    toneLabel: 'Ton powiadomień',
    premiumTone: (label: string) => `${label} · Premium`,
    aggressiveWarningTitle: 'Na pewno bardzo agresywne?',
    aggressiveWarningBody:
      'Te powiadomienia zawierają wulgaryzmy i są naprawdę wulgarne oraz obraźliwe. Pojawią się też na ekranie blokady, gdzie mogą je zobaczyć inni. Czy na pewno chcesz takie powiadomienia?',
    aggressiveWarningConfirm: 'Tak, dawaj',
    tones: { passive: 'Pasywny', mild: 'Lekko agresywny', aggressive: 'Bardzo agresywny' },
    deliveryHints: {
      everyPayment: 'Powiadomimy po każdej płatności w tym sklepie.',
      crossing: 'Powiadomimy, gdy przekroczysz 50%, 80%, 90% i 100% limitu.',
    },
    toneHints: {
      passive: 'Spokojnie przypomnimy, ile zostało.',
      mild: 'Dostaniesz złośliwą uwagę. Im bliżej limitu, tym ostrzej.',
      aggressive: 'Dostaniesz ostry opie***l z wulgaryzmami. Im bliżej limitu, tym gorzej.',
    },
    permissionNote: 'Zapytamy o zgodę na powiadomienia. Limit sprawdzamy po aktualizacji transakcji w aplikacji.',
    delete: 'Usuń limit',
    channel: 'Limity wydatków',
    noMerchants: 'Sklepy pojawią się po dodaniu lub przechwyceniu transakcji w PLN.',
    noMatchingMerchant: 'Nie znaleziono sklepu. Spróbuj innej nazwy.',
    noMatchingCategory: 'Nie znaleziono kategorii. Spróbuj innej nazwy.',
  },
  en: {
    periods: { week: 'this week', month: 'this month', year: 'this year', custom: 'in the selected period' },
    allSpending: 'all spending',
    metrics: { expense: 'Spending', income: 'Income', netFlow: 'Net flow' },
    missingIncomeTitle: 'Expected income has not arrived',
    missingIncomeBody: (period: string, reached: string, target: string) =>
      `Income ${period}: ${reached} of the expected ${target}.`,
    reachedTitle: (metric: AlertMetric, scope: ScopeName) => {
      const subject = englishSubject(metric, scope);

      return `${subject.charAt(0).toUpperCase()}${subject.slice(1)} reached`;
    },
    reachedBody: (metric: AlertMetric, noun: string, period: string, reached: string, target: string) =>
      `${noun} ${period}: ${reached} against a ${metric === 'expense' ? 'limit' : 'threshold'} of ${target}.`,
    nearTitle: (metric: AlertMetric, scope: ScopeName) => `Close to your ${englishSubject(metric, scope)}`,
    nearBody: (noun: string, period: string, reached: string, target: string, remaining: string) =>
      `${noun} ${period}: ${reached} of ${target}. ${remaining} left.`,
    frequency: { week: 'weekly', month: 'monthly', year: 'yearly', custom: 'in the selected period' },
    limitPeriods: { week: 'Weekly', month: 'Monthly', year: 'Yearly', custom: 'Custom' },
    title: 'Limits and alerts',
    done: 'Done',
    empty: 'You have no limits yet. Set an amount for the month and we will let you know before you reach it.',
    editHint: 'Opens the limit settings',
    disabled: ' · off',
    add: 'Add a limit',
    periodNames: { week: 'Week', month: 'Month', year: 'Year' },
    enterAmount: 'Enter an amount greater than zero.',
    permissionDenied:
      'Without notification permission we cannot warn you. You can turn it on in the system Settings.',
    cancel: 'Cancel',
    newLimit: 'New limit',
    limit: 'Limit',
    save: 'Save',
    scopeSection: 'Limit scope',
    searchShop: 'Search shops',
    searchPlaceholder: 'Search your transaction history',
    scopeLists: { merchant: 'Shops', category: 'Categories' },
    searchCategory: 'Search categories',
    selectedScope: (label: string) => `Selected: ${label}`,
    deletedCategory: 'Deleted category',
    existingLimitTitle: 'This already has a limit',
    existingLimitBody: (label: string) => `${label} already has a limit. Open it to change the amount or period.`,
    openExistingLimit: 'Open limit',
    allSpendingOption: 'All spending',
    amount: 'Limit amount',
    amountPlaceholder: '0.00',
    decimalSeparator: '.',
    period: 'Limit period',
    missingIncomeHint: 'We will let you know at the end of the period if the income does not arrive.',
    missingIncomeLabel: 'Warn me when income does not arrive',
    notificationsLabel: 'Notifications',
    notificationsOn: 'Notifications',
    notificationsOff: 'No notifications',
    toneLabel: 'Notification tone',
    premiumTone: (label: string) => `${label} · Premium`,
    aggressiveWarningTitle: 'Really go brutal?',
    aggressiveWarningBody:
      'These notifications contain swearing and are genuinely vulgar and insulting. They also show on the Lock Screen, where others may see them. Are you sure you want them?',
    aggressiveWarningConfirm: 'Yes, bring it',
    tones: { passive: 'Calm', mild: 'Snarky', aggressive: 'Brutal' },
    deliveryHints: {
      everyPayment: 'We notify you after every payment at this shop.',
      crossing: 'We notify you when you pass 50%, 80%, 90% and 100% of the limit.',
    },
    toneHints: {
      passive: 'We calmly tell you how much is left.',
      mild: 'You get a snarky remark. The closer to the limit, the sharper.',
      aggressive: 'You get yelled at, swearing included. The closer to the limit, the worse.',
    },
    permissionNote: 'We will ask for notification permission. Limits are checked when transactions update in the app.',
    delete: 'Delete limit',
    channel: 'Spending limits',
    noMerchants: 'Shops appear once you add or capture transactions in PLN.',
    noMatchingMerchant: 'No shop found. Try another name.',
    noMatchingCategory: 'No category found. Try another name.',
  },
});
