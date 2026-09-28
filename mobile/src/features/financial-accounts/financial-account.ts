import { currentCopy } from '@/features/localization/language';

import { financialAccountsCopy } from './financial-accounts-copy';

const financialAccountBanks = ['manual', 'millennium', 'pko'] as const;

export type FinancialAccountBank = (typeof financialAccountBanks)[number];

export function isFinancialAccountBank(value: unknown): value is FinancialAccountBank {
  return financialAccountBanks.some((bank) => bank === value);
}

export function financialAccountBank(value: string): FinancialAccountBank {
  return isFinancialAccountBank(value) ? value : 'manual';
}

export interface FinancialAccount {
  id: string;
  bank: FinancialAccountBank;
  name: string;
  isGeneral: boolean;
}

export const generalManualAccountId = 'general-manual';

export const maximumAccountNameLength = 60;

function generalAccounts(): FinancialAccount[] {
  return [
    {
      id: generalManualAccountId,
      bank: 'manual',
      name: currentCopy(financialAccountsCopy).cashAndOther,
      isGeneral: true,
    },
    { id: 'general-millennium', bank: 'millennium', name: 'Millennium', isGeneral: true },
    { id: 'general-pko', bank: 'pko', name: 'PKO BP', isGeneral: true },
  ];
}

export function withGeneralAccounts(stored: FinancialAccount[]): FinancialAccount[] {
  const storedById = new Map(stored.map((account) => [account.id, account]));
  const defaultNames = new Set(Object.values(financialAccountsCopy).map((copy) => copy.cashAndOther));
  const general = generalAccounts().map((account) => {
    const stored = storedById.get(account.id);

    if (stored === undefined) {
      return account;
    }

    return defaultNames.has(stored.name) ? { ...stored, name: account.name } : stored;
  });
  const added = stored
    .filter((account) => !account.isGeneral)
    .sort((left, right) => left.name.localeCompare(right.name, 'pl'));

  return [...general, ...added];
}

export function newFinancialAccount(name: string, now: Date, random: () => number): FinancialAccount {
  const suffix = Math.floor(random() * 0xffffff)
    .toString(36)
    .padStart(5, '0');

  return {
    id: `account-${now.getTime().toString(36)}-${suffix}`,
    bank: 'manual',
    name: name.trim(),
    isGeneral: false,
  };
}

export function accountNameError(name: string, existing: FinancialAccount[]): string | null {
  const trimmed = name.trim();

  if (trimmed === '') {
    return currentCopy(financialAccountsCopy).enterName;
  }

  if (trimmed.length > maximumAccountNameLength) {
    return currentCopy(financialAccountsCopy).nameTooLong(maximumAccountNameLength);
  }

  const lowered = trimmed.toLocaleLowerCase('pl');

  if (existing.some((account) => account.name.toLocaleLowerCase('pl') === lowered)) {
    return currentCopy(financialAccountsCopy).duplicateName;
  }

  return null;
}
