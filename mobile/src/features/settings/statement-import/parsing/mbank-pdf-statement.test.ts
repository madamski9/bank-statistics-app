import { describe, expect, test } from 'bun:test';

import { parseMbankPdfStatement } from './mbank-pdf-statement';

const columnHeader = ['Data', 'księgowania', 'Data', 'operacji', 'Opis operacji Kwota Saldo po', 'operacji'];

const statement = [
  'mBank S.A. Bankowość Detaliczna',
  'www.mBank.pl',
  'mLinia: 801 300 800',
  'JAN TESTOWY',
  'Elektroniczne zestawienie operacji za okres od 2025-01-16 do 2025-03-16',
  'Opis rachunku',
  'Rodzaj rachunku EKONTO',
  'Waluta PLN',
  'Podsumowanie obrotów na rachunku Liczba operacji Wartość operacji',
  'Uznania 3 1 518,00',
  'Obciążenia 5 466,98',
  'Łącznie 8 1 051,02',
  'Operacje',
  'Saldo początkowe: 100,00',
  ...columnHeader,
  '2025-01-16 2025-01-16 BLIK P2P-WYCHODZĄCY',
  'PRZELEW ŚRODKÓW',
  '-30,00 70,00',
  '2025-01-18 2025-01-18 ZAKUP PRZY UŻYCIU KARTY',
  'KAWIARNIA TESTOWA /Gdansk DATA TRANSAKCJI: 2025-01-17',
  '-40,00 30,00',
  '2025-01-22 2025-01-22 BLIK P2P-PRZYCHODZĄCY',
  'Przelew na telefon Od: 48000000000 Do: 480*****000',
  '39,00 69,00',
  'Strona : 1 / 3',
  'Data',
  'księgowania',
  'Data',
  'operacji',
  '2025-01-23 2025-01-23 2025-01-31 2025-01-31 2025-02-07 2025-02-08 Opis operacji Kwota Saldo po',
  'operacji',
  'BLIK ZAKUP E-COMMERCE',
  'SKLEP-INTERNETOWY.PL',
  '-40,48 28,52',
  'ZAKUP PRZY UŻYCIU KARTY',
  'APPLE.COM/BILL /APPLE.COM/ DATA TRANSAKCJI: 2025-01-30',
  '-4,99 23,53',
  'BLIK P2P-PRZYCHODZĄCY',
  'Zwrot',
  '1 479,00 1 502,53',
  'Strona : 2 / 3',
  ...columnHeader,
  '2025-02-22 2025-02-22 ZAKUP PRZY UŻYCIU KARTY',
  'LINIA LOTNICZA ABC123/XYZ789 DATA TRANSAKCJI: 2025-02-19',
  '-351,51 1 151,02',
  '2025-03-08 2025-03-08 PRZELEW WEWNĘTRZNY PRZYCHODZĄCY',
  'ANNA PRZYKŁADOWA TESTOWO, OSIEDLOWA 1 00-000 MIASTO',
  '00000000000000000000000000',
  'PRZELEW ŚRODKÓW',
  '0,00 1 151,02',
  'Saldo końcowe: 1 151,02',
  'Niniejszy dokument sporządzono na podstawie art. 7 Ustawy Prawo Bankowe.',
  'Strona : 3 / 3',
].join('\n');

describe('parseMbankPdfStatement', () => {
  test('reads operations with their own dates and operations under a shared date column', () => {
    const result = parseMbankPdfStatement(statement.replace('0,00 1 151,02', '10,00 1 161,02').replace('Saldo końcowe: 1 151,02', 'Saldo końcowe: 1 161,02'));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.bank).toBe('mbank');
    expect(result.skippedCount).toBe(0);
    expect(
      result.rows.map((row) => [row.date, row.direction, row.amountMinor, row.currency, row.transactionType, row.party]),
    ).toEqual([
      ['2025-01-16', 'expense', 3000, 'PLN', 'outgoingTransfer', 'PRZELEW ŚRODKÓW'],
      ['2025-01-17', 'expense', 4000, 'PLN', 'cardPayment', 'KAWIARNIA TESTOWA'],
      ['2025-01-22', 'income', 3900, 'PLN', 'incomingTransfer', 'Przelew na telefon'],
      ['2025-01-23', 'expense', 4048, 'PLN', 'blikPayment', 'SKLEP-INTERNETOWY.PL'],
      ['2025-01-30', 'expense', 499, 'PLN', 'cardPayment', 'APPLE.COM/BILL'],
      ['2025-02-08', 'income', 147_900, 'PLN', 'incomingTransfer', 'Zwrot'],
      ['2025-02-19', 'expense', 35_151, 'PLN', 'cardPayment', 'LINIA LOTNICZA ABC123'],
      ['2025-03-08', 'income', 1000, 'PLN', 'incomingTransfer', 'ANNA PRZYKŁADOWA TESTOWO'],
    ]);
  });

  test('refuses a statement whose amounts do not add up to the balance', () => {
    const broken = statement.replace('-4,99 23,53', '-5,99 23,53');

    expect(parseMbankPdfStatement(broken)).toEqual({ ok: false, problem: 'inconsistent' });
  });

  test('refuses a statement truncated after a complete page of operations', () => {
    const firstPage = statement.split('Strona : 1 / 3')[0];

    expect(parseMbankPdfStatement(firstPage)).toEqual({ ok: false, problem: 'inconsistent' });
  });

  test('refuses a missing interior page even when its operations net to zero', () => {
    const firstPage = [
      'mBank S.A.',
      'Waluta PLN',
      'Saldo początkowe: 100,00',
      ...columnHeader,
      '2025-01-18 2025-01-18 ZAKUP PRZY UŻYCIU KARTY',
      'SKLEP TESTOWY /Gdansk DATA TRANSAKCJI: 2025-01-17',
      '-10,00 90,00',
      'Strona : 1 / 3',
    ].join('\n');
    const middlePage = [
      ...columnHeader,
      '2025-01-19 2025-01-19 PRZELEW WEWNĘTRZNY PRZYCHODZĄCY',
      'JAN TESTOWY',
      '50,00 140,00',
      '2025-01-19 2025-01-19 PRZELEW WEWNĘTRZNY WYCHODZĄCY',
      'JAN TESTOWY',
      '-50,00 90,00',
      'Strona : 2 / 3',
    ].join('\n');
    const lastPage = [
      ...columnHeader,
      '2025-01-20 2025-01-20 ZAKUP PRZY UŻYCIU KARTY',
      'SKLEP TESTOWY /Gdansk DATA TRANSAKCJI: 2025-01-20',
      '-20,00 70,00',
      'Saldo końcowe: 70,00',
      'Strona : 3 / 3',
    ].join('\n');
    const complete = parseMbankPdfStatement([firstPage, middlePage, lastPage].join('\n'));

    expect(complete.ok ? complete.rows.length : 0).toBe(4);
    expect(parseMbankPdfStatement([firstPage, lastPage].join('\n'))).toEqual({ ok: false, problem: 'inconsistent' });
  });

  test.each([
    ['duplicate page', statement.replace('Strona : 2 / 3', 'Strona : 1 / 3')],
    ['out-of-order page', statement.replace(/Strona : ([12]) \/ 3/g, (_, page: string) => `Strona : ${page === '1' ? '2' : '1'} / 3`)],
    ['inconsistent final page total', statement.replace('Strona : 3 / 3', 'Strona : 3 / 4')],
    ['missing final page marker', statement.replace('Strona : 3 / 3', '')],
  ])('refuses a statement with %s', (_, text) => {
    expect(parseMbankPdfStatement(text)).toEqual({ ok: false, problem: 'inconsistent' });
  });

  test('accepts a matching zero closing balance', () => {
    const text = [
      'mBank S.A.',
      'Waluta PLN',
      'Saldo początkowe: 100,00',
      ...columnHeader,
      '2025-01-18 2025-01-18 ZAKUP PRZY UŻYCIU KARTY',
      'SKLEP TESTOWY /Gdansk DATA TRANSAKCJI: 2025-01-17',
      '-100,00 0,00',
      'Saldo końcowe: 0,00',
    ].join('\n');
    const result = parseMbankPdfStatement(text);

    expect(result.ok).toBe(true);
    expect(result.ok ? result.rows.map((row) => row.amountMinor) : []).toEqual([10_000]);
  });

  test('refuses a statement whose closing balance disagrees', () => {
    const broken = statement.replace('Saldo końcowe: 1 151,02', 'Saldo końcowe: 1 152,02');

    expect(parseMbankPdfStatement(broken)).toEqual({ ok: false, problem: 'inconsistent' });
  });

  test('refuses a page whose shared dates do not cover every operation', () => {
    const broken = statement.replace(' 2025-02-07 2025-02-08 Opis operacji', ' Opis operacji');

    expect(parseMbankPdfStatement(broken)).toEqual({ ok: false, problem: 'inconsistent' });
  });

  test('refuses an operation that never shows its amount', () => {
    const broken = statement.replace('-40,00 30,00\n', '');

    expect(parseMbankPdfStatement(broken)).toEqual({ ok: false, problem: 'inconsistent' });
  });

  test('skips a zero amount operation instead of importing it', () => {
    const result = parseMbankPdfStatement(statement);

    expect(result.ok).toBe(true);
    expect(result.ok ? result.rows.length : 0).toBe(7);
    expect(result.ok ? result.skippedCount : 0).toBe(1);
  });

  test('explains text that is not an mBank statement', () => {
    expect(parseMbankPdfStatement('')).toEqual({ ok: false, problem: 'empty' });
    expect(parseMbankPdfStatement('Zwykły dokument')).toEqual({ ok: false, problem: 'unrecognized' });
  });

  test('reports an operations section without any operation', () => {
    const empty = ['Waluta PLN', 'Saldo początkowe: 10,00', ...columnHeader, 'Saldo końcowe: 10,00'].join('\n');

    expect(parseMbankPdfStatement(empty)).toEqual({ ok: false, problem: 'noTransactions' });
  });
});
