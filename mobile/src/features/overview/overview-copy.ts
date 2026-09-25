import { defineCopy } from '@/features/localization/language';

export const overviewCopy = defineCopy({
  pl: {
    expense: 'Wydatki',
    income: 'Przychody',
    net: 'Przepływ',
    expenseLabel: (amount: string, period: string, count: string) => `Wydatki, ${amount}, ${period}, ${count}`,
    incomeLabel: (amount: string, period: string) => `Przychody, ${amount}, ${period}`,
    netLabel: (amount: string, period: string) => `Przepływ, przychody minus wydatki, ${amount}, ${period}`,
    context: (period: string) => `Wydatki · ${period}`,
    versus: 'vs',
    captureIosOnly: 'Przechwytywanie powiadomień działa na razie tylko na iOS.',
    noTransactions:
      'Nie przechwycono jeszcze żadnej transakcji. Skonfiguruj automatyzację powiadomień w aplikacji Skróty.',
    transactions: 'Transakcje',
    peak: { day: 'Maks. / dzień', week: 'Maks. / tydz.', month: 'Maks. / mies.' },
    topSource: 'Top źródło',
    average: { day: 'Średnio dziennie', week: 'Średnio na tydzień', month: 'Średnio na miesiąc' },
  },
  en: {
    expense: 'Spending',
    income: 'Income',
    net: 'Net flow',
    expenseLabel: (amount: string, period: string, count: string) => `Spending, ${amount}, ${period}, ${count}`,
    incomeLabel: (amount: string, period: string) => `Income, ${amount}, ${period}`,
    netLabel: (amount: string, period: string) => `Net flow, income minus spending, ${amount}, ${period}`,
    context: (period: string) => `Spending · ${period}`,
    versus: 'vs',
    captureIosOnly: 'Notification capture currently works on iOS only.',
    noTransactions:
      'No transactions captured yet. Set up the notification automation in the Shortcuts app.',
    transactions: 'Transactions',
    peak: { day: 'Max / day', week: 'Max / week', month: 'Max / month' },
    topSource: 'Top source',
    average: { day: 'Daily average', week: 'Weekly average', month: 'Monthly average' },
  },
});
