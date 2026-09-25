import { defineCopy } from '@/features/localization/language';

export const dataExportCopy = defineCopy({
  pl: {
    notes: [
      'Kwoty są dodatnie; kierunek (expense - wydatek, income - wpływ) jest w kolumnie direction.',
      'amountMinor to kwota w groszach lub centach waluty z kolumny currency.',
      'Transakcje odczytane z powiadomień banku (origin: capture) mogą nie obejmować wszystkich operacji na koncie.',
      'Eksport nie zawiera treści powiadomień bankowych.',
    ],
  },
  en: {
    notes: [
      'Amounts are positive; the direction (expense or income) is in the direction column.',
      'amountMinor is the amount in the smallest unit of the currency in the currency column.',
      'Transactions read from bank notifications (origin: capture) may not cover every operation on the account.',
      'The export does not include the text of bank notifications.',
    ],
  },
});
