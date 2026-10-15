import { defineCopy } from '@/features/app-shell/localization/language';

export const homeCopy = defineCopy({
  pl: {
    tabs: { overview: 'Przegląd', transactions: 'Transakcje', merchants: 'Sklepy' },
    accountHint: 'Pokazuje profil i ustawienia konta',
    account: 'Konto',
    accountOf: (name: string) => `Konto: ${name}`,
  },
  en: {
    tabs: { overview: 'Overview', transactions: 'Transactions', merchants: 'Shops' },
    accountHint: 'Shows your profile and account settings',
    account: 'Account',
    accountOf: (name: string) => `Account: ${name}`,
  },
});
