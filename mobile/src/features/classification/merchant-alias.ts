import { merchantKey } from '@/features/merchants/merchant-name';

export interface ResolvedMerchant {
  key: string;
  name: string;
  label: string;
  isAlias: boolean;
}

const canonicalMerchants = [
  'Żabka',
  'Biedronka',
  'Lidl',
  'Kaufland',
  'Auchan',
  'Carrefour',
  'Dino',
  'Netto',
  'Aldi',
  'Stokrotka',
  'Rossmann',
  'Hebe',
  'Empik',
  'Media Expert',
  'RTV Euro AGD',
  'Decathlon',
  'Allegro',
  'InPost',
  'Orlen',
  'Shell',
  'BP',
  'Circle K',
  'McDonald’s',
  'KFC',
  'Burger King',
  'Starbucks',
  'Costa Coffee',
  'Pyszne.pl',
  'Glovo',
  'Bolt',
  'Uber',
  'Zalando',
  'Reserved',
  'Sinsay',
  'Cropp',
  'House',
  'Mohito',
  'Pepco',
  'Action',
  'Jysk',
  'IKEA',
  'Leroy Merlin',
  'Castorama',
  'OBI',
  'Inmedio',
  'Relay',
  'Kolporter',
  'Apteka Gemini',
  'Doz Apteka',
  'Super-Pharm',
];

const extraSpellings: Record<string, string[]> = {
  Żabka: ['zabka nano'],
  'McDonald’s': ['mcdonalds', 'mc donalds', 'mcdonald s'],
  'RTV Euro AGD': ['euro rtv agd', 'euro agd'],
  'Pyszne.pl': ['pyszne pl', 'pyszne'],
  'Super-Pharm': ['super pharm'],
  InPost: ['inpost paczkomat', 'paczkomat'],
};

function fold(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/giu, 'l')
    .toLocaleLowerCase('pl')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter((word) => word !== '');
}

interface AliasEntry {
  name: string;
  words: string[];
}

const aliasEntries: AliasEntry[] = canonicalMerchants
  .flatMap((name) => [name, ...(extraSpellings[name] ?? [])].map((spelling) => ({
    name,
    words: fold(spelling),
  })))
  .sort((left, right) => right.words.length - left.words.length);

function startsWithWords(words: string[], prefix: string[]): boolean {
  return (
    prefix.length <= words.length && prefix.every((word, index) => words[index] === word)
  );
}

export function resolveMerchant(label: string): ResolvedMerchant {
  const trimmed = label.replace(/\s+/gu, ' ').trim();
  const words = fold(trimmed);
  const alias = aliasEntries.find((entry) => startsWithWords(words, entry.words));

  if (alias === undefined) {
    return { key: merchantKey(trimmed), name: trimmed, label: trimmed, isAlias: false };
  }

  return { key: merchantKey(alias.name), name: alias.name, label: trimmed, isAlias: true };
}
