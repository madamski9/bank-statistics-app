import { describe, expect, test } from 'bun:test';

import {
  inferTransactionType,
  parseStatement,
  parseStatementAmount,
  parseStatementDate,
  splitDelimited,
} from './statement-parser';
import { decodeStatementBytes } from './statement-text';

const millenniumStatement = [
  '"Numer rachunku/karty","Data transakcji","Data rozliczenia","Rodzaj transakcji","Na konto/Z konta","Odbiorca/Zleceniodawca","Opis","Obciążenia","Uznania","Saldo","Waluta"',
  '"PL00 0000 0000","2026-09-21","2026-09-22","TRANSAKCJA KARTĄ PŁATNICZĄ","","","LIDL GDANSK PL","-25.08","","1000.00","PLN"',
  '"PL00 0000 0000","2026-09-20","2026-09-20","PRZELEW PRZYCHODZĄCY","PL11 1111","JAN KOWALSKI","Zwrot za obiad","","120.00","1025.08","PLN"',
  '"PL00 0000 0000","2026-09-19","2026-09-19","BLIK ZAKUP","","","ALLEGRO","-1 234.50","","905.08","PLN"',
].join('\r\n');

const pkoStatement = [
  '"Data operacji","Data waluty","Typ transakcji","Kwota","Waluta","Saldo po transakcji","Opis transakcji","",""',
  '"2026-09-21","2026-09-22","Płatność kartą","-12,99","PLN","+500,00","Tytuł: 000498849","Lokalizacja: Adres: ZABKA Z1234 Miasto: GDANSK Kraj: POLSKA",""',
  '"2026-09-20","2026-09-20","Przelew na rachunek","+3 500,00","PLN","+512,99","Rachunek nadawcy: 00 0000","Nazwa nadawcy: FIRMA SP Z O O","Tytuł: WYNAGRODZENIE"',
].join('\n');

describe('splitDelimited', () => {
  test('keeps delimiters and escaped quotes inside quoted cells', () => {
    expect(splitDelimited('a;"b;c";"say ""hi"""\n1;2;3', ';')).toEqual([
      ['a', 'b;c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });
});

describe('parseStatementAmount', () => {
  test('reads signed amounts in Polish and English notation', () => {
    expect(parseStatementAmount('-25.08')).toBe(-2508);
    expect(parseStatementAmount('+3 500,00')).toBe(350_000);
    expect(parseStatementAmount('1.234,5')).toBe(123_450);
    expect(parseStatementAmount('1,234.56')).toBe(123_456);
  });

  test('rejects zero, blanks and text', () => {
    expect(parseStatementAmount('0,00')).toBeNull();
    expect(parseStatementAmount('')).toBeNull();
    expect(parseStatementAmount('n/d')).toBeNull();
  });
});

describe('parseStatementDate', () => {
  test('reads ISO and Polish dates', () => {
    expect(parseStatementDate('2026-09-21')).toBe('2026-09-21');
    expect(parseStatementDate('21.09.2026')).toBe('2026-09-21');
    expect(parseStatementDate('2026-09-21 14:05:00')).toBe('2026-09-21');
  });

  test('rejects impossible dates', () => {
    expect(parseStatementDate('31.02.2026')).toBeNull();
    expect(parseStatementDate('wczoraj')).toBeNull();
  });
});

describe('inferTransactionType', () => {
  test('names common operations from the bank label', () => {
    expect(inferTransactionType('TRANSAKCJA KARTĄ PŁATNICZĄ', 'expense')).toBe('cardPayment');
    expect(inferTransactionType('BLIK ZAKUP', 'expense')).toBe('blikPayment');
    expect(inferTransactionType('Przelew na rachunek', 'income')).toBe('incomingTransfer');
    expect(inferTransactionType('Wypłata z bankomatu', 'expense')).toBe('atmWithdrawal');
    expect(inferTransactionType('Opłata za kartę', 'expense')).toBe('fee');
    expect(inferTransactionType('Kapitalizacja odsetek', 'income')).toBe('interest');
    expect(inferTransactionType('Coś innego', 'expense')).toBeUndefined();
  });
});

describe('parseStatement', () => {
  test('reads a Millennium statement with separate debit and credit columns', () => {
    const result = parseStatement(millenniumStatement);

    expect(result).toEqual({
      ok: true,
      bank: 'millennium',
      skippedCount: 0,
      rows: [
        {
          date: '2026-09-21',
          direction: 'expense',
          amountMinor: 2508,
          currency: 'PLN',
          party: 'LIDL GDANSK PL',
          transactionType: 'cardPayment',
        },
        {
          date: '2026-09-20',
          direction: 'income',
          amountMinor: 12_000,
          currency: 'PLN',
          party: 'JAN KOWALSKI',
          transactionType: 'incomingTransfer',
        },
        {
          date: '2026-09-19',
          direction: 'expense',
          amountMinor: 123_450,
          currency: 'PLN',
          party: 'ALLEGRO',
          transactionType: 'blikPayment',
        },
      ],
    });
  });

  test('reads a PKO statement and finds the party in its detail columns', () => {
    const result = parseStatement(pkoStatement);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.bank).toBe('pko');
    expect(result.rows.map((row) => [row.direction, row.amountMinor, row.party, row.transactionType])).toEqual([
      ['expense', 1299, 'ZABKA Z1234', 'cardPayment'],
      ['income', 350_000, 'FIRMA SP Z O O', 'incomingTransfer'],
    ]);
  });

  test('skips a preamble before the header and counts unreadable rows', () => {
    const result = parseStatement(
      ['Erste Bank Polska;;', 'Historia rachunku;;', 'Data;Kwota;Opis', '21.09.2026;-10,00;Kawa', 'Suma;-10,00;'].join(
        '\n',
      ),
    );

    expect(result).toMatchObject({ ok: true, bank: 'erste', skippedCount: 1 });
  });

  test('never takes the bank from transaction text', () => {
    const otherBank = ['Data księgowania;Kwota operacji;Waluta;Opis', '21.09.2026;-10,00;PLN;BANKOMAT PKO BP WARSZAWA'].join(
      '\n',
    );

    expect(parseStatement(otherBank)).toEqual({ ok: false, problem: 'unsupportedBank' });
  });

  test('refuses a statement from a bank we do not offer', () => {
    expect(parseStatement('mBank S.A.;;\nData;Kwota;Opis\n21.09.2026;-10,00;Kawa')).toEqual({
      ok: false,
      problem: 'unsupportedBank',
    });
  });

  test('explains files it cannot use', () => {
    expect(parseStatement('  ')).toEqual({ ok: false, problem: 'empty' });
    expect(parseStatement('imie;nazwisko\nJan;Kowalski')).toEqual({ ok: false, problem: 'unrecognized' });
    expect(parseStatement('PKO BP;\nData;Kwota\nbrak;brak')).toEqual({ ok: false, problem: 'noTransactions' });
  });
});

describe('decodeStatementBytes', () => {
  test('reads UTF-8 and drops the byte order mark', () => {
    const bytes = new TextEncoder().encode('﻿Obciążenia');

    expect(decodeStatementBytes(bytes)).toBe('Obciążenia');
  });

  test('falls back to Windows-1250 for Polish letters', () => {
    const bytes = new Uint8Array([0x4f, 0x62, 0x63, 0x69, 0xb9, 0xbf, 0x65, 0x6e, 0x69, 0x61]);

    expect(decodeStatementBytes(bytes)).toBe('Obciążenia');
  });
});
