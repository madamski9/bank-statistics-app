import { describe, expect, test } from 'bun:test';

import { detectStatementBank } from './statement-bank';
import { readStatement } from './statement-reading';

describe('detectStatementBank', () => {
  test('recognises each offered bank by its name, website or BIC', () => {
    expect(
      detectStatementBank('www.bankmillennium.pl TeleMillennium 801 331 331\nBIC/S.W.I.F.T.: BIGBPLPWXXX'),
    ).toBe('millennium');
    expect(detectStatementBank('PKO Bank Polski SA, BIC: BPKOPLPW, www.pkobp.pl')).toBe('pko');
    expect(detectStatementBank('Erste Bank Polska S.A.')).toBe('erste');
    expect(detectStatementBank('Santander Bank Polska S.A. BIC WBKPPLPP')).toBe('erste');
    expect(detectStatementBank('mBank S.A. Bankowość Detaliczna\nwww.mBank.pl\nmLinia: 801 300 800')).toBe('mbank');
  });

  test('ignores letter case and Polish diacritics', () => {
    expect(detectStatementBank('BANK MILLENNIUM S.A. — WYCIĄG')).toBe('millennium');
  });

  test('picks the bank named most often when a counterparty mentions another', () => {
    expect(
      detectStatementBank('www.bankmillennium.pl\nTeleMillennium\nBIGBPLPWXXX\nPrzelew z PKO BP od Jana'),
    ).toBe('millennium');
  });

  test('refuses banks we do not offer and ambiguous text', () => {
    expect(detectStatementBank('Alior Bank S.A. wyciąg z rachunku')).toBeNull();
    expect(detectStatementBank('Bank Millennium i PKO BP')).toBeNull();
    expect(detectStatementBank('')).toBeNull();
  });
});

describe('readStatement', () => {
  test('reads PDF statements only from Millennium and mBank', () => {
    expect(readStatement('PKO Bank Polski\nWyciąg', 'pdf')).toEqual({ ok: false, problem: 'unsupportedPdf' });
    expect(readStatement('ING Bank Śląski\nWyciąg', 'pdf')).toEqual({ ok: false, problem: 'unsupportedBank' });
    expect(readStatement(' ', 'pdf')).toEqual({ ok: false, problem: 'empty' });
  });

  test('passes a Millennium PDF statement to its parser', () => {
    const text = [
      'www.bankmillennium.pl TeleMillennium 801 331 331',
      'Konto WALUTA: PLN',
      'SALDO POCZĄTKOWE: 100,00',
      '2026-01-05 2026-01-05 PŁATNOŚĆ KARTĄ 10,00- 90,00',
      'SKLEP',
      'SALDO KOŃCOWE: 90,00',
    ].join('\n');

    expect(readStatement(text, 'pdf')).toMatchObject({
      ok: true,
      bank: 'millennium',
      rows: [{ direction: 'expense', amountMinor: 1000, party: 'SKLEP' }],
    });
  });

  test('passes an mBank PDF statement to its parser', () => {
    const text = [
      'mBank S.A. Bankowość Detaliczna',
      'www.mBank.pl',
      'Waluta PLN',
      'Saldo początkowe: 100,00',
      '2025-01-18 2025-01-18 ZAKUP PRZY UŻYCIU KARTY',
      'SKLEP /Gdansk DATA TRANSAKCJI: 2025-01-17',
      '-10,00 90,00',
      'Saldo końcowe: 90,00',
    ].join('\n');

    expect(readStatement(text, 'pdf')).toMatchObject({
      ok: true,
      bank: 'mbank',
      rows: [{ date: '2025-01-17', direction: 'expense', amountMinor: 1000, party: 'SKLEP' }],
    });
  });
});
