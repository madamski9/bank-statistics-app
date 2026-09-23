const financialAccountBanks = ['manual', 'millennium'] as const;

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

const generalAccounts: FinancialAccount[] = [
  { id: generalManualAccountId, bank: 'manual', name: 'Gotówka i inne', isGeneral: true },
  { id: 'general-millennium', bank: 'millennium', name: 'Millennium', isGeneral: true },
];

export function withGeneralAccounts(stored: FinancialAccount[]): FinancialAccount[] {
  const storedById = new Map(stored.map((account) => [account.id, account]));
  const general = generalAccounts.map((account) => storedById.get(account.id) ?? account);
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
    return 'Podaj nazwę konta.';
  }

  if (trimmed.length > maximumAccountNameLength) {
    return `Nazwa konta może mieć najwyżej ${maximumAccountNameLength} znaków.`;
  }

  const lowered = trimmed.toLocaleLowerCase('pl');

  if (existing.some((account) => account.name.toLocaleLowerCase('pl') === lowered)) {
    return 'Masz już konto o tej nazwie.';
  }

  return null;
}
