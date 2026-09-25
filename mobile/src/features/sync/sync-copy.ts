import { defineCopy } from '@/features/localization/language';

export const foreignDeviceCopy = defineCopy({
  pl: {
    confirmTitle: 'Usunąć dane z tego telefonu?',
    confirmBody:
      'Transakcje, konta, reguły i limity poprzedniej osoby znikną z tego telefonu. To, co zdążyło się zsynchronizować, zostaje na jej koncie.',
    cancel: 'Anuluj',
    removeAndContinue: 'Usuń i kontynuuj',
    removeFailed: 'Nie udało się usunąć danych z telefonu. Spróbuj ponownie.',
    signOutFailed: 'Nie udało się wylogować. Spróbuj ponownie.',
    title: 'Ten telefon należy do innego konta',
    ownerBody:
      'Na tym telefonie są dane osoby, która wcześniej używała tu BankStats. Nie pokażemy ich i nie wyślemy na Twoje konto.',
    choiceBody:
      'Wyloguj się, żeby ta osoba mogła wrócić, albo usuń jej dane z telefonu i korzystaj z niego na swoim koncie.',
    signOut: 'Wyloguj się',
    removeData: 'Usuń dane z telefonu i kontynuuj',
  },
  en: {
    confirmTitle: 'Remove the data from this phone?',
    confirmBody:
      "The previous person's transactions, accounts, rules and limits will disappear from this phone. Whatever was already synchronized stays in their account.",
    cancel: 'Cancel',
    removeAndContinue: 'Remove and continue',
    removeFailed: 'Could not remove the data from this phone. Please try again.',
    signOutFailed: 'Could not sign out. Please try again.',
    title: 'This phone belongs to another account',
    ownerBody:
      "This phone holds data of someone who used BankStats here before. We won't show it or send it to your account.",
    choiceBody:
      'Sign out so that person can come back, or remove their data from this phone and use it with your account.',
    signOut: 'Sign out',
    removeData: 'Remove data from this phone and continue',
  },
});
