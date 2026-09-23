import type { SpendingDimension } from '@/features/classification/spending-groups';

function polishPlural(count: number, one: string, few: string, many: string): string {
  if (count === 1) {
    return one;
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  const takesFew = lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14);

  return takesFew ? few : many;
}

export function groupCount(count: number, dimension: SpendingDimension): string {
  if (dimension === 'counterparty') {
    return `${count} ${polishPlural(count, 'osoba', 'osoby', 'osób')}`;
  }

  if (dimension === 'category') {
    return `${count} ${polishPlural(count, 'kategoria', 'kategorie', 'kategorii')}`;
  }

  return `${count} ${polishPlural(count, 'sklep', 'sklepy', 'sklepów')}`;
}

export function transactionCount(count: number, dimension: SpendingDimension): string {
  if (dimension === 'merchant') {
    return `${count} ${polishPlural(count, 'zakup', 'zakupy', 'zakupów')}`;
  }

  return `${count} ${polishPlural(count, 'transakcja', 'transakcje', 'transakcji')}`;
}
