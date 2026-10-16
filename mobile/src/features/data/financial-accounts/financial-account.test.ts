import { describe, expect, test } from 'bun:test';

import {
  accountNameError,
  generalManualAccountId,
  newFinancialAccount,
  withGeneralAccounts,
  type FinancialAccount,
} from './financial-account';

describe('withGeneralAccounts', () => {
  test('always offers a general account for manual entries and for each supported bank', () => {
    const accounts = withGeneralAccounts([]);

    expect(accounts.map((account) => account.id)).toEqual([
      generalManualAccountId,
      'general-millennium',
      'general-pko',
      'general-erste',
      'general-ing',
      'general-mbank',
    ]);
    expect(accounts.every((account) => account.isGeneral)).toBe(true);
  });

  test('uses the name a user gave a general account', () => {
    const renamed: FinancialAccount = {
      id: generalManualAccountId,
      bank: 'manual',
      name: 'Portfel',
      isGeneral: true,
    };

    expect(withGeneralAccounts([renamed])[0]).toEqual(renamed);
  });

  test('lists the accounts a user added after the general ones, alphabetically', () => {
    const accounts = withGeneralAccounts([
      { id: 'account-b', bank: 'manual', name: 'Walutowe', isGeneral: false },
      { id: 'account-a', bank: 'manual', name: 'Oszczędnościowe', isGeneral: false },
    ]);

    expect(accounts.filter((account) => !account.isGeneral).map((account) => account.name)).toEqual(['Oszczędnościowe', 'Walutowe']);
  });
});

describe('newFinancialAccount', () => {
  test('creates a trimmed, non-general account with a fresh id', () => {
    const account = newFinancialAccount('  Konto wspólne ', new Date(1_800_000_000_000), () => 0.5);

    expect(account).toMatchObject({ bank: 'manual', name: 'Konto wspólne', isGeneral: false });
    expect(account.id).toStartWith('account-');
  });
});

describe('accountNameError', () => {
  test('refuses an empty name, an overly long one and a duplicate', () => {
    const existing = withGeneralAccounts([]);

    expect(accountNameError('   ', existing)).not.toBeNull();
    expect(accountNameError('x'.repeat(61), existing)).not.toBeNull();
    expect(accountNameError('gotówka i inne', existing)).not.toBeNull();
    expect(accountNameError('Oszczędnościowe', existing)).toBeNull();
  });
});
