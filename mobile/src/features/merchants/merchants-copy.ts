import { defineCopy } from '@/features/localization/language';

export const merchantsCopy = defineCopy({
  pl: {
    empty: {
      merchant:
        'Brak sklepów w tym okresie. Nazwy sklepów przychodzą z powiadomień Portfela - wybierz Max, aby zobaczyć wszystko.',
      counterparty:
        'Brak przelewów do osób w tym okresie. Przelew z nazwą odbiorcy trafi tutaj, a nie do statystyk sklepów.',
      category:
        'Brak wydatków w tym okresie. Kategoria pojawi się, gdy transakcja zostanie rozpoznana lub poprawiona.',
    },
    captureIosOnly: 'Przechwytywanie powiadomień działa na razie tylko na iOS.',
    loading: 'Wczytywanie…',
    createLimitHint: 'Otwiera formularz wyboru sklepu i kwoty limitu',
    createLimitLabel: 'Ustaw limit sklepu',
    limit: 'Limit',
    createCategoryHint: 'Otwiera tworzenie własnej kategorii i przypisywanie do niej sklepów',
    createCategoryLabel: 'Dodaj kategorię',
    category: 'Kategoria',
    groupHint: 'Otwiera historię i wykres wydatków',
    shareOfSpending: (share: string) => `${share} wydatków`,
    dimensions: {
      merchant: { label: 'Sklepy', hint: 'Wydatki w sklepach' },
      counterparty: { label: 'Osoby', hint: 'Przelewy do osób i firm' },
      category: { label: 'Kategorie', hint: 'Wydatki według kategorii' },
    },
    backHint: 'Wraca do listy',
    closeLabel: (name: string) => `Zamknij ${name}`,
    close: 'Zamknij',
    average: 'średnio',
    limitHint: 'Otwiera ustawienia limitu',
    limitTitle: (period: string) => `Limit ${period}`,
    limitProgress: (spent: string, target: string) => `${spent} z ${target}`,
    of: 'z',
    setLimitHint: 'Otwiera ustawienie limitu',
    setLimit: 'Ustaw limit',
    history: 'Historia',
    highest: 'Najwięcej',
    selected: 'Wybrany okres',
  },
  en: {
    empty: {
      merchant:
        'No shops in this period. Shop names come from Wallet notifications - choose Max to see everything.',
      counterparty:
        'No transfers to people in this period. A transfer with a recipient name lands here instead of the shop statistics.',
      category:
        'No spending in this period. A category appears once a transaction is recognised or corrected.',
    },
    captureIosOnly: 'Notification capture currently works on iOS only.',
    loading: 'Loading…',
    createLimitHint: 'Opens the form to pick a shop and a limit amount',
    createLimitLabel: 'Set a shop limit',
    limit: 'Limit',
    createCategoryHint: 'Opens creating a custom category and assigning shops to it',
    createCategoryLabel: 'Add a category',
    category: 'Category',
    groupHint: 'Opens the spending history and chart',
    shareOfSpending: (share: string) => `${share} of spending`,
    dimensions: {
      merchant: { label: 'Shops', hint: 'Spending in shops' },
      counterparty: { label: 'People', hint: 'Transfers to people and companies' },
      category: { label: 'Categories', hint: 'Spending by category' },
    },
    backHint: 'Goes back to the list',
    closeLabel: (name: string) => `Close ${name}`,
    close: 'Close',
    average: 'average',
    limitHint: 'Opens the limit settings',
    limitTitle: (period: string) => `${period} limit`,
    limitProgress: (spent: string, target: string) => `${spent} of ${target}`,
    of: 'of',
    setLimitHint: 'Opens the limit setting',
    setLimit: 'Set a limit',
    history: 'History',
    highest: 'Highest',
    selected: 'Selected',
  },
});
