import { describe, expect, test } from 'bun:test';

import { parseMillenniumPdfStatement } from './millennium-pdf-statement';

const footer = [
  'www.bankmillennium.pl TeleMillennium 801 331 331 Wyciąg nr 1/2026 z dnia 31.01.2026',
];
const pageHeader = ['strona 2 z 2', 'DATA', 'KSIĘG.', 'DATA', 'WAL. OPIS TRANSAKCJI WARTOŚĆ SALDO'];

const statement = [
  'strona 1 z 2',
  'WYCIĄG ŁĄCZONY',
  'PODSUMOWANIE',
  'OSZCZĘDNOŚCI NUMER WALUTA SALDO',
  'Konto Testowe 00 0000 0000 0000 0000 0000 0000 PLN 1.000,00',
  'RACHUNKI BIEŻĄCE - INFORMACJE SZCZEGÓŁOWE',
  'Konto Testowe WALUTA: PLN IBAN: PL00 0000 0000 0000 0000 0000 0000',
  'SALDO POCZĄTKOWE: 1.000,00',
  'DATA',
  'KSIĘG.',
  'DATA',
  'WAL. OPIS TRANSAKCJI WARTOŚĆ SALDO',
  '2026-01-05 2026-01-05 PŁATNOŚĆ KARTĄ 12,50- 987,50',
  'SKLEP TESTOWY 1 ul. Przykladowa 1 Miasto',
  'Karta: 0000XXXXXXXX0000 Posiadacz: JAN TESTOWY',
  'Dnia: 2026-01-03 ZAKUP - FIZ. UŻYCIE KARTY',
  'Kwota transakcji: 12.50 PLN',
  '2026-01-06 2026-01-06 PRZELEW NA NUMER TELEFONU Z R-ku:00000000000000000000000000',
  'Nadawca:ANNA PRZYKLADOWA Tytułem:Przelew na telefon',
  'Od: 48000000000 Do: 480*****000',
  '2026-01-07 2026-01-07 PRZELEW PRZYCHODZĄCY Z R-ku:00000000000000000000000001',
  'FIRMA TESTOWA SP Z O O Wynagrodzenie',
  'DATA NADANIA: 2026-01-07',
  '2026-01-08 2026-01-08 WPŁATA SKLEP ZWROTOWY ul. Zwrotna 2',
  'Karta: 0000XXXXXXXX0000 Posiadacz: JAN TESTOWY',
  'Dnia: 2026-01-07 ZAKUP - ZWROT',
  '20,00 1.007,50',
  '2.500,00 3.507,50',
  '10,00 3.517,50',
  ...footer,
  ...pageHeader,
  'Kwota transakcji: 10.00 PLN',
  '2026-01-09 2026-01-09 PŁATNOŚĆ BLIK W INTERNECIE 99,99- 3.417,51',
  'sklep-internetowy.pl',
  'ZLECENIODAWCA: JAN TESTOWY',
  '2026-01-12 2026-01-12 PRZELEW NA NUMER TELEFONU Na R-k:00000000000000000000000002',
  'Odbiorca:Kolega Tytułem:Pizza',
  'Na nr tel.:48000000001',
  '2026-01-12 2026-01-12 PŁATNOŚĆ KARTĄ SUBSKRYPCJA* TEST Market Street',
  'Karta: 0000XXXXXXXX0000 Posiadacz: JAN TESTOWY',
  'Dnia: 2026-01-11 ZAKUP - BEZ FIZ. UŻYCIA KARTY',
  'Kwota transakcji: 10.00 EUR Kurs walutowy: 1 EUR = 4.3000 PLN',
  '30,00- 3.387,51',
  '43,00- 3.344,51',
  ...footer,
  'SUMA UZNAŃ: 2.530,00',
  'SUMA OBCIĄŻEŃ: 185,49',
  'SALDO KOŃCOWE: 3.344,51',
  'Konto walutowe WALUTA: EUR IBAN: PL00 0000 0000 0000 0000 0000 0001',
  'SALDO POCZĄTKOWE: 0,00',
  '2026-01-20 2026-01-20 PRZELEW PRZYCHODZĄCY 15,00 15,00',
  'Z R-ku:00000000000000000000000003',
  'Nadawca:EURO TEST Tytułem:Zwrot',
  'SALDO KOŃCOWE: 15,00',
  'DOKUMENT WYGENEROWANY ELEKTRONICZNIE - NIE OPATRYWANY PODPISEM ANI STEMPLEM',
].join('\n');

describe('parseMillenniumPdfStatement', () => {
  test('pairs amounts printed in line and amounts collected at the end of a page', () => {
    const result = parseMillenniumPdfStatement(statement);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.bank).toBe('millennium');
    expect(
      result.rows.map((row) => [
        row.date,
        row.direction,
        row.amountMinor,
        row.currency,
        row.transactionType,
        row.party,
      ]),
    ).toEqual([
      ['2026-01-03', 'expense', 1250, 'PLN', 'cardPayment', 'SKLEP TESTOWY 1 ul. Przykladowa 1 Miasto'],
      ['2026-01-06', 'income', 2000, 'PLN', 'incomingTransfer', 'ANNA PRZYKLADOWA'],
      ['2026-01-07', 'income', 250_000, 'PLN', 'incomingTransfer', 'FIRMA TESTOWA SP Z O O Wynagrodzenie'],
      ['2026-01-07', 'income', 1000, 'PLN', 'refund', 'SKLEP ZWROTOWY ul. Zwrotna 2'],
      ['2026-01-09', 'expense', 9999, 'PLN', 'blikPayment', 'sklep-internetowy.pl'],
      ['2026-01-12', 'expense', 3000, 'PLN', 'outgoingTransfer', 'Kolega'],
      ['2026-01-11', 'expense', 4300, 'PLN', 'cardPayment', 'SUBSKRYPCJA* TEST Market Street'],
      ['2026-01-20', 'income', 1500, 'EUR', 'incomingTransfer', 'EURO TEST'],
    ]);
  });

  test('keeps the card currency of a foreign payment for matching', () => {
    const result = parseMillenniumPdfStatement(statement);
    const foreign = result.ok ? result.rows[6] : undefined;

    expect(foreign).toMatchObject({ amountMinor: 4300, currency: 'PLN', originalAmountMinor: 1000, originalCurrency: 'EUR' });
    expect(result.ok ? result.rows[0].originalCurrency : 'missing').toBeUndefined();
  });

  test('refuses a statement whose amounts do not add up to the balance', () => {
    const broken = statement.replace('43,00- 3.344,51', '44,00- 3.344,51');

    expect(parseMillenniumPdfStatement(broken)).toEqual({ ok: false, problem: 'inconsistent' });
  });

  test('refuses a statement with an amount missing', () => {
    const missing = statement.replace('30,00- 3.387,51\n', '');

    expect(parseMillenniumPdfStatement(missing)).toEqual({ ok: false, problem: 'inconsistent' });
  });

  test('explains text that is not a statement', () => {
    expect(parseMillenniumPdfStatement('')).toEqual({ ok: false, problem: 'empty' });
    expect(parseMillenniumPdfStatement('Zwykły dokument')).toEqual({ ok: false, problem: 'unrecognized' });
  });
});
