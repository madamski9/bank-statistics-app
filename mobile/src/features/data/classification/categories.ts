import { currentCopy, defineCopy, type Language } from '@/features/app-shell/localization/language';
import { merchantKey } from '@/features/home/merchants/naming/merchant-name';

export interface CategoryOption {
  id: string;
  label: string;
}

export const uncategorizedCategory = 'uncategorized';

export interface CustomCategory {
  id: string;
  name: string;
}

const customCategoryPrefix = 'category-';
let registeredCustomCategories: CustomCategory[] = [];

export function setCustomCategories(categories: CustomCategory[]): void {
  registeredCustomCategories = categories;
}

export function customCategories(): CustomCategory[] {
  return registeredCustomCategories;
}

export function isCustomCategoryId(category: string): boolean {
  return category.startsWith(customCategoryPrefix);
}

function customCategoryName(category: string): string | undefined {
  return registeredCustomCategories.find((candidate) => candidate.id === category)?.name;
}

export function knownCategory(category: string | undefined): string | undefined {
  if (category === undefined || !isCustomCategoryId(category)) {
    return category;
  }

  return customCategoryName(category) === undefined ? undefined : category;
}

const categoryCopy = defineCopy({
  pl: {
    uncategorized: 'Bez kategorii',
    labels: {
      groceries: 'Zakupy spożywcze',
      eatingOut: 'Jedzenie na mieście',
      transport: 'Transport i paliwo',
      health: 'Zdrowie i apteka',
      home: 'Dom i wyposażenie',
      clothing: 'Odzież',
      entertainment: 'Rozrywka',
      services: 'Usługi i subskrypcje',
      transfers: 'Przelewy osobiste',
      other: 'Inne wydatki',
    },
  },
  en: {
    uncategorized: 'Uncategorized',
    labels: {
      groceries: 'Groceries',
      eatingOut: 'Eating out',
      transport: 'Transport and fuel',
      health: 'Health and pharmacy',
      home: 'Home and furnishings',
      clothing: 'Clothing',
      entertainment: 'Entertainment',
      services: 'Services and subscriptions',
      transfers: 'Personal transfers',
      other: 'Other spending',
    },
  },
});

type CategoryId = keyof (typeof categoryCopy)['pl']['labels'];

const categoryIds: CategoryId[] = [
  'groceries',
  'eatingOut',
  'transport',
  'health',
  'home',
  'clothing',
  'entertainment',
  'services',
  'transfers',
  'other',
];

export function uncategorizedLabel(): string {
  return currentCopy(categoryCopy).uncategorized;
}

export function builtInCategoryLabels(): string[] {
  const { labels } = currentCopy(categoryCopy);

  return categoryIds.map((id) => labels[id]);
}

export function categoryOptions(language?: Language): CategoryOption[] {
  const { labels } = currentCopy(categoryCopy, language);
  const custom = [...registeredCustomCategories]
    .sort((left, right) => left.name.localeCompare(right.name, 'pl'))
    .map((category) => ({ id: category.id, label: category.name }));

  return [...categoryIds.map((id) => ({ id, label: labels[id] })), ...custom];
}

function isCategoryId(category: string): category is CategoryId {
  return categoryIds.some((id) => id === category);
}

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
  Lewiatan: 'groceries',
  Polomarket: 'groceries',
  Intermarché: 'groceries',
  'E.Leclerc': 'groceries',
  'Delikatesy Centrum': 'groceries',
  Spar: 'groceries',
  Eurospar: 'groceries',
  Społem: 'groceries',
  Topaz: 'groceries',
  'Chata Polska': 'groceries',
  Groszek: 'groceries',
  Freshmarket: 'groceries',
  Selgros: 'groceries',
  Makro: 'groceries',
  'Twój Market': 'groceries',
  'Top Market': 'groceries',
  'Gram Market': 'groceries',
  Frisco: 'groceries',
  'Piotr i Paweł': 'groceries',
  'Duży Ben': 'groceries',
  Barbora: 'groceries',
  'McDonald’s': 'eatingOut',
  KFC: 'eatingOut',
  'Burger King': 'eatingOut',
  Starbucks: 'eatingOut',
  'Costa Coffee': 'eatingOut',
  'Pyszne.pl': 'eatingOut',
  Glovo: 'eatingOut',
  'Pizza Hut': 'eatingOut',
  'Domino’s': 'eatingOut',
  Subway: 'eatingOut',
  Telepizza: 'eatingOut',
  'Da Grasso': 'eatingOut',
  'North Fish': 'eatingOut',
  Sphinx: 'eatingOut',
  'Green Caffè Nero': 'eatingOut',
  Coffeeheaven: 'eatingOut',
  'Tim Hortons': 'eatingOut',
  Pasibus: 'eatingOut',
  'Bobby Burger': 'eatingOut',
  'Max Premium Burgers': 'eatingOut',
  Popeyes: 'eatingOut',
  Wolt: 'eatingOut',
  'Uber Eats': 'eatingOut',
  'Bolt Food': 'eatingOut',
  'Salad Story': 'eatingOut',
  'Thai Wok': 'eatingOut',
  Manekin: 'eatingOut',
  'Krispy Kreme': 'eatingOut',
  Grycan: 'eatingOut',
  Blikle: 'eatingOut',
  'Pijalnia Czekolady Wedel': 'eatingOut',
  'Chłopskie Jadło': 'eatingOut',
  Orlen: 'transport',
  Shell: 'transport',
  BP: 'transport',
  'Circle K': 'transport',
  Bolt: 'transport',
  Uber: 'transport',
  Lotos: 'transport',
  Moya: 'transport',
  Amic: 'transport',
  Avia: 'transport',
  'Free Now': 'transport',
  'PKP Intercity': 'transport',
  'Koleje Mazowieckie': 'transport',
  Koleo: 'transport',
  Jakdojade: 'transport',
  SkyCash: 'transport',
  FlixBus: 'transport',
  Ryanair: 'transport',
  'Wizz Air': 'transport',
  LOT: 'transport',
  Panek: 'transport',
  Traficar: 'transport',
  Lime: 'transport',
  Veturilo: 'transport',
  mobiParking: 'transport',
  Polregio: 'transport',
  Rossmann: 'health',
  Hebe: 'health',
  'Apteka Gemini': 'health',
  'Doz Apteka': 'health',
  'Super-Pharm': 'health',
  'Dr.Max': 'health',
  Ziko: 'health',
  'Apteka Ziko': 'health',
  Cefarm: 'health',
  'Apteka Słoneczna': 'health',
  'Drogerie Natura': 'health',
  Douglas: 'health',
  Sephora: 'health',
  Notino: 'health',
  Inglot: 'health',
  Kontigo: 'health',
  Medicover: 'health',
  'Lux Med': 'health',
  'Enel-Med': 'health',
  Diagnostyka: 'health',
  Synevo: 'health',
  Alab: 'health',
  'Apteka Melissa': 'health',
  Jysk: 'home',
  IKEA: 'home',
  'Leroy Merlin': 'home',
  Castorama: 'home',
  OBI: 'home',
  Pepco: 'home',
  Action: 'home',
  'Agata Meble': 'home',
  'Black Red White': 'home',
  Bricomarché: 'home',
  Bricoman: 'home',
  'Merkury Market': 'home',
  'PSB Mrówka': 'home',
  'Home&You': 'home',
  Duka: 'home',
  Homla: 'home',
  Kik: 'home',
  Tedi: 'home',
  Dealz: 'home',
  Abra: 'home',
  Jula: 'home',
  'Flying Tiger': 'home',
  Westwing: 'home',
  Zalando: 'clothing',
  Reserved: 'clothing',
  Sinsay: 'clothing',
  Cropp: 'clothing',
  House: 'clothing',
  Mohito: 'clothing',
  Decathlon: 'clothing',
  'H&M': 'clothing',
  Zara: 'clothing',
  Bershka: 'clothing',
  'Pull&Bear': 'clothing',
  Stradivarius: 'clothing',
  Mango: 'clothing',
  'New Yorker': 'clothing',
  'C&A': 'clothing',
  'TK Maxx': 'clothing',
  Primark: 'clothing',
  'Big Star': 'clothing',
  Diverse: 'clothing',
  '4F': 'clothing',
  Wólczanka: 'clothing',
  Vistula: 'clothing',
  Ochnik: 'clothing',
  CCC: 'clothing',
  Deichmann: 'clothing',
  Answear: 'clothing',
  Modivo: 'clothing',
  eobuwie: 'clothing',
  Sizeer: 'clothing',
  Nike: 'clothing',
  Adidas: 'clothing',
  'Martes Sport': 'clothing',
  Intersport: 'clothing',
  'Go Sport': 'clothing',
  'Top Secret': 'clothing',
  'Half Price': 'clothing',
  KappAhl: 'clothing',
  Orsay: 'clothing',
  Shein: 'clothing',
  Lancerto: 'clothing',
  Guess: 'clothing',
  Empik: 'entertainment',
  'Media Expert': 'entertainment',
  'RTV Euro AGD': 'entertainment',
  'Media Markt': 'entertainment',
  Neonet: 'entertainment',
  'x-kom': 'entertainment',
  Komputronik: 'entertainment',
  Morele: 'entertainment',
  'Cinema City': 'entertainment',
  Multikino: 'entertainment',
  Helios: 'entertainment',
  Steam: 'entertainment',
  PlayStation: 'entertainment',
  Xbox: 'entertainment',
  Nintendo: 'entertainment',
  'Epic Games': 'entertainment',
  eBilet: 'entertainment',
  Ticketmaster: 'entertainment',
  Matras: 'entertainment',
  'Świat Książki': 'entertainment',
  Smyk: 'entertainment',
  Lego: 'entertainment',
  Energylandia: 'entertainment',
  Allegro: 'services',
  InPost: 'services',
  Netflix: 'services',
  Spotify: 'services',
  'HBO Max': 'services',
  'Disney+': 'services',
  YouTube: 'services',
  Google: 'services',
  Apple: 'services',
  Microsoft: 'services',
  Canva: 'services',
  OpenAI: 'services',
  Tidal: 'services',
  Audioteka: 'services',
  Legimi: 'services',
  Storytel: 'services',
  Player: 'services',
  'Canal+': 'services',
  'Polsat Box': 'services',
  Orange: 'services',
  Play: 'services',
  'T-Mobile': 'services',
  Heyah: 'services',
  Netia: 'services',
  UPC: 'services',
  Vectra: 'services',
  PGE: 'services',
  Tauron: 'services',
  Enea: 'services',
  Energa: 'services',
  PGNiG: 'services',
  Veolia: 'services',
  DPD: 'services',
  DHL: 'services',
  'Poczta Polska': 'services',
  Booksy: 'services',
  'Amazon Prime': 'services',
  Inmedio: 'other',
  Relay: 'other',
  Kolporter: 'other',
  Temu: 'other',
  AliExpress: 'other',
  Amazon: 'other',
  Tchibo: 'other',
  Apart: 'other',
  'W.Kruk': 'other',
};

export const knownMerchantNames = Object.keys(categoriesByMerchant);

const suggestionsByKey = new Map(
  Object.entries(categoriesByMerchant).map(([name, category]) => [merchantKey(name), category]),
);

export function suggestedCategory(merchantName: string): string | null {
  return suggestionsByKey.get(merchantKey(merchantName)) ?? null;
}

export function categoryLabel(category: string | undefined): string {
  if (category === undefined || category.trim() === '' || category === uncategorizedCategory) {
    return uncategorizedLabel();
  }

  if (isCustomCategoryId(category)) {
    return customCategoryName(category) ?? uncategorizedLabel();
  }

  return isCategoryId(category) ? currentCopy(categoryCopy).labels[category] : category;
}
