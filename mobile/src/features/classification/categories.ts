import { merchantKey } from '@/features/merchants/merchant-name';

export interface CategoryOption {
  id: string;
  label: string;
}

export const uncategorizedLabel = 'Bez kategorii';

export const uncategorizedCategory = 'uncategorized';

export const categoryOptions: CategoryOption[] = [
  { id: 'groceries', label: 'Zakupy spożywcze' },
  { id: 'eatingOut', label: 'Jedzenie na mieście' },
  { id: 'transport', label: 'Transport i paliwo' },
  { id: 'health', label: 'Zdrowie i apteka' },
  { id: 'home', label: 'Dom i wyposażenie' },
  { id: 'clothing', label: 'Odzież' },
  { id: 'entertainment', label: 'Rozrywka' },
  { id: 'services', label: 'Usługi i subskrypcje' },
  { id: 'transfers', label: 'Przelewy osobiste' },
  { id: 'other', label: 'Inne wydatki' },
];

const categoriesByMerchant: Record<string, string> = {
  Żabka: 'groceries',
  Biedronka: 'groceries',
  Lidl: 'groceries',
  Kaufland: 'groceries',
  Auchan: 'groceries',
  Carrefour: 'groceries',
  Dino: 'groceries',
  Netto: 'groceries',
  Aldi: 'groceries',
  Stokrotka: 'groceries',
  'McDonald’s': 'eatingOut',
  KFC: 'eatingOut',
  'Burger King': 'eatingOut',
  Starbucks: 'eatingOut',
  'Costa Coffee': 'eatingOut',
  'Pyszne.pl': 'eatingOut',
  Glovo: 'eatingOut',
  Orlen: 'transport',
  Shell: 'transport',
  BP: 'transport',
  'Circle K': 'transport',
  Bolt: 'transport',
  Uber: 'transport',
  Rossmann: 'health',
  Hebe: 'health',
  'Apteka Gemini': 'health',
  'Doz Apteka': 'health',
  'Super-Pharm': 'health',
  Jysk: 'home',
  IKEA: 'home',
  'Leroy Merlin': 'home',
  Castorama: 'home',
  OBI: 'home',
  Pepco: 'home',
  Action: 'home',
  Zalando: 'clothing',
  Reserved: 'clothing',
  Sinsay: 'clothing',
  Cropp: 'clothing',
  House: 'clothing',
  Mohito: 'clothing',
  Decathlon: 'clothing',
  Empik: 'entertainment',
  'Media Expert': 'entertainment',
  'RTV Euro AGD': 'entertainment',
  Allegro: 'services',
  InPost: 'services',
  Inmedio: 'other',
  Relay: 'other',
  Kolporter: 'other',
};

const suggestionsByKey = new Map(
  Object.entries(categoriesByMerchant).map(([name, category]) => [merchantKey(name), category]),
);

const labelsById = new Map(categoryOptions.map((option) => [option.id, option.label]));

export function suggestedCategory(merchantName: string): string | null {
  return suggestionsByKey.get(merchantKey(merchantName)) ?? null;
}

export function categoryLabel(category: string | undefined): string {
  if (category === undefined || category.trim() === '' || category === uncategorizedCategory) {
    return uncategorizedLabel;
  }

  return labelsById.get(category) ?? category;
}
