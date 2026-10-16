import { defineCopy } from '@/features/app-shell/localization/language';

export const statementImportCopy = defineCopy({
  pl: {
    title: 'Import wyciągu',
    close: 'Zamknij',
    entryLabel: 'Importuj wyciąg',
    entryHint: 'Wybierz wyciąg PDF z mBanku lub Millennium albo plik CSV z bankowości internetowej',
    entryFootnote:
      'Porównamy wyciąg z transakcjami z powiadomień i dodamy tylko te, których brakuje. Plik zostaje na telefonie.',
    intro:
      'Wybierz wyciąg PDF albo historię konta pobraną jako CSV. Sprawdzimy, ile transakcji wyłapały powiadomienia, i uzupełnimy resztę.',
    supportedPdf: {
      before: 'Na razie obsługujemy wyciągi PDF tylko z ',
      banks: ['mBanku', 'Millennium'],
      separator: ' i ',
      after: '.',
    },
    choose: 'Wybierz plik',
    reading: 'Czytamy wyciąg…',
    chooseAnother: 'Wybierz inny plik',
    problems: {
      empty: 'Ten plik jest pusty.',
      unrecognized:
        'Nie rozpoznajemy tego pliku. Potrzebny jest wyciąg PDF albo CSV z kolumnami daty i kwoty, pobrany z historii rachunku.',
      unsupportedBank:
        'Nie rozpoznajemy banku, z którego pochodzi ten wyciąg. Importujemy tylko wyciągi z mBanku, Millennium, PKO BP i Erste.',
      noTransactions: 'W tym pliku nie ma transakcji, które dałoby się odczytać.',
      unreadable: 'Nie udało się otworzyć pliku. Spróbuj ponownie.',
      unsupportedPdf: 'Z plików PDF czytamy na razie tylko wyciągi z mBanku i Millennium. Dla PKO BP i Erste wybierz plik CSV.',
      inconsistent:
        'Kwoty w tym wyciągu nie zgadzają się z saldem, więc nie importujemy go, żeby nie dodać błędnych transakcji.',
      pickerUnavailable: 'Ta wersja aplikacji nie umie jeszcze otwierać plików. Zaktualizuj aplikację.',
    },
    detectedBank: (bank: string) => `Wyciąg: ${bank}`,
    period: (first: string, last: string) => `${first} – ${last}`,
    coverageTitle: 'Powiadomienia wyłapały',
    coverage: (captured: number, total: number, percent: number) =>
      `${captured} z ${total} transakcji (${percent}%)`,
    alreadyAdded: (count: number) => `${count} już dodanych ręcznie albo z wcześniejszego importu`,
    skipped: (count: number) => `${count} wierszy pominęliśmy, bo nie miały daty albo kwoty`,
    allPresent: 'Wszystkie transakcje z wyciągu są już w aplikacji.',
    missingSection: 'BRAKUJĄCE TRANSAKCJE',
    missingFootnote: 'Odznacz to, czego nie chcesz dodawać, na przykład przelewy między własnymi kontami.',
    noName: 'Bez nazwy',
    add: (count: number) => (count === 0 ? 'Nic nie zaznaczono' : `Dodaj zaznaczone (${count})`),
    adding: 'Dodajemy…',
    addFailed: 'Nie udało się dodać wszystkich transakcji. Spróbuj ponownie.',
    added: (count: number) => `Dodaliśmy ${count} transakcji z wyciągu.`,
    done: 'Gotowe',
  },
  en: {
    title: 'Statement import',
    close: 'Close',
    entryLabel: 'Import a statement',
    entryHint: 'Choose an mBank or Millennium PDF statement or a CSV file from online banking',
    entryFootnote:
      'We compare the statement with transactions from notifications and add only the missing ones. The file stays on this phone.',
    intro:
      'Choose a PDF statement or an account history downloaded as CSV. We check how many transactions notifications caught and fill in the rest.',
    supportedPdf: {
      before: 'For now we only read PDF statements from ',
      banks: ['mBank', 'Millennium'],
      separator: ' and ',
      after: '.',
    },
    choose: 'Choose a file',
    reading: 'Reading the statement…',
    chooseAnother: 'Choose another file',
    problems: {
      empty: 'This file is empty.',
      unrecognized:
        'We do not recognise this file. It needs to be a PDF statement or a CSV with date and amount columns, downloaded from the account history.',
      unsupportedBank:
        'We cannot tell which bank this statement is from. We only import statements from mBank, Millennium, PKO BP and Erste.',
      noTransactions: 'This file has no transactions we can read.',
      unreadable: 'Could not open the file. Please try again.',
      unsupportedPdf: 'For now we only read PDF statements from mBank and Millennium. For PKO BP and Erste, choose a CSV file.',
      inconsistent:
        'The amounts in this statement do not add up to its balance, so we are not importing it to avoid adding wrong transactions.',
      pickerUnavailable: 'This version of the app cannot open files yet. Please update the app.',
    },
    detectedBank: (bank: string) => `Statement: ${bank}`,
    period: (first: string, last: string) => `${first} – ${last}`,
    coverageTitle: 'Notifications caught',
    coverage: (captured: number, total: number, percent: number) =>
      `${captured} of ${total} transactions (${percent}%)`,
    alreadyAdded: (count: number) => `${count} already added by hand or from an earlier import`,
    skipped: (count: number) => `${count} rows skipped because they had no date or amount`,
    allPresent: 'Every transaction from the statement is already in the app.',
    missingSection: 'MISSING TRANSACTIONS',
    missingFootnote: 'Untick anything you do not want to add, such as transfers between your own accounts.',
    noName: 'No name',
    add: (count: number) => (count === 0 ? 'Nothing selected' : `Add selected (${count})`),
    adding: 'Adding…',
    addFailed: 'Could not add every transaction. Please try again.',
    added: (count: number) => `Added ${count} transactions from the statement.`,
    done: 'Done',
  },
});
