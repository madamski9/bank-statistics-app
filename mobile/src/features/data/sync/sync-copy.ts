import { defineCopy } from '@/features/app-shell/localization/language';

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

export const cloudSyncCopy = defineCopy({
  pl: {
    section: 'SYNCHRONIZACJA Z CHMURĄ',
    label: 'Synchronizuj przez chmurę',
    onFootnote:
      'Znormalizowane transakcje (kwota, sklep, kategoria, data) trafiają do chmury w UE, żeby działały inne urządzenia i kopia zapasowa. Treść powiadomień banku nigdy nie opuszcza telefonu.',
    offFootnote:
      'Tryb tylko na tym telefonie: nic nie wysyłamy do chmury. Jeśli zgubisz telefon albo usuniesz aplikację, dane znikną. Kursy NBP nadal pobieramy, podając tylko walutę i datę.',
    offTitle: 'Zostawić dane tylko na tym telefonie?',
    offBody:
      'Przestaniemy synchronizować transakcje. Możesz też usunąć kopię, która jest już w chmurze. Inne zalogowane urządzenia mogą nadal wysyłać swoje dane.',
    keepCloudCopy: 'Wyłącz, zostaw kopię',
    deleteCloudCopy: 'Wyłącz i usuń kopię z chmury',
    cancel: 'Anuluj',
    failed: 'Nie udało się usunąć kopii z chmury. Spróbuj ponownie, gdy będziesz online.',
    deleting: 'Usuwamy kopię z chmury…',
  },
  en: {
    section: 'CLOUD SYNC',
    label: 'Sync through the cloud',
    onFootnote:
      'Normalized transactions (amount, shop, category, date) go to the cloud in the EU so your other devices and backups work. Bank notification text never leaves the phone.',
    offFootnote:
      'This-phone-only mode: nothing is sent to the cloud. If you lose the phone or delete the app, the data is gone. NBP rates are still fetched using only the currency and date.',
    offTitle: 'Keep your data on this phone only?',
    offBody:
      'We will stop syncing transactions. You can also delete the copy already in the cloud. Other signed-in devices may keep sending their data.',
    keepCloudCopy: 'Turn off, keep the copy',
    deleteCloudCopy: 'Turn off and delete the cloud copy',
    cancel: 'Cancel',
    failed: 'Could not delete the cloud copy. Try again when you are online.',
    deleting: 'Deleting the cloud copy…',
  },
});

export const cloudSyncChoiceCopy = defineCopy({
  pl: {
    title: 'Gdzie trzymać Twoje dane?',
    body: 'Możesz synchronizować transakcje przez chmurę albo trzymać je tylko na tym telefonie. Zmienisz to w każdej chwili w ustawieniach danych.',
    syncedTitle: 'Synchronizacja przez chmurę',
    syncedBody:
      'Kwota, sklep, kategoria i data trafiają na serwer w UE, żeby działała kopia zapasowa i drugie urządzenie. Treść powiadomień banku nigdy nie opuszcza telefonu.',
    localTitle: 'Tylko na tym telefonie',
    localBody: 'Nic nie wysyłamy. Jeśli zgubisz telefon albo usuniesz aplikację, dane znikną.',
    enable: 'Synchronizuj przez chmurę',
    keepLocal: 'Tylko na tym telefonie',
    saveFailed: 'Nie udało się zapisać wyboru. Spróbuj ponownie.',
  },
  en: {
    title: 'Where should your data live?',
    body: 'You can sync transactions through the cloud or keep them on this phone only. You can change this any time in data settings.',
    syncedTitle: 'Sync through the cloud',
    syncedBody:
      'Amount, shop, category and date go to a server in the EU so backups and a second device work. Bank notification text never leaves the phone.',
    localTitle: 'This phone only',
    localBody: 'Nothing is sent. If you lose the phone or delete the app, the data is gone.',
    enable: 'Sync through the cloud',
    keepLocal: 'This phone only',
    saveFailed: 'Could not save your choice. Please try again.',
  },
});
