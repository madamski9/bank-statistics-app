import type { SpendingDimension } from '@/features/classification/spending-groups';
import { currentCopy, defineCopy } from '@/features/localization/language';
import { englishPlural, polishPlural } from '@/features/localization/plural';

const countCopy = defineCopy({
  pl: {
    people: (count: number) => `${count} ${polishPlural(count, 'osoba', 'osoby', 'osób')}`,
    categories: (count: number) =>
      `${count} ${polishPlural(count, 'kategoria', 'kategorie', 'kategorii')}`,
    shops: (count: number) => `${count} ${polishPlural(count, 'sklep', 'sklepy', 'sklepów')}`,
    purchases: (count: number) => `${count} ${polishPlural(count, 'zakup', 'zakupy', 'zakupów')}`,
    transactions: (count: number) =>
      `${count} ${polishPlural(count, 'transakcja', 'transakcje', 'transakcji')}`,
  },
  en: {
    people: (count: number) => `${count} ${englishPlural(count, 'person', 'people')}`,
    categories: (count: number) => `${count} ${englishPlural(count, 'category', 'categories')}`,
    shops: (count: number) => `${count} ${englishPlural(count, 'shop', 'shops')}`,
    purchases: (count: number) => `${count} ${englishPlural(count, 'purchase', 'purchases')}`,
    transactions: (count: number) => `${count} ${englishPlural(count, 'transaction', 'transactions')}`,
  },
});

export function groupCount(count: number, dimension: SpendingDimension): string {
  const copy = currentCopy(countCopy);

  if (dimension === 'counterparty') {
    return copy.people(count);
  }

  return dimension === 'category' ? copy.categories(count) : copy.shops(count);
}

export function transactionCount(count: number, dimension: SpendingDimension): string {
  const copy = currentCopy(countCopy);

  return dimension === 'merchant' ? copy.purchases(count) : copy.transactions(count);
}
