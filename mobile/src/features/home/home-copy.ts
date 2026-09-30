import { defineCopy } from '@/features/localization/language';

export const homeCopy = defineCopy({
  pl: {
    tabs: { overview: 'Przegląd', transactions: 'Transakcje', merchants: 'Sklepy', insights: 'Wgląd' },
    accountHint: 'Pokazuje profil i ustawienia konta',
    account: 'Konto',
    accountOf: (name: string) => `Konto: ${name}`,
  },
  en: {
    tabs: { overview: 'Overview', transactions: 'Transactions', merchants: 'Shops', insights: 'Insights' },
    accountHint: 'Shows your profile and account settings',
    account: 'Account',
    accountOf: (name: string) => `Account: ${name}`,
  },
});
