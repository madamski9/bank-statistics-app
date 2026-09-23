import { merchantKey } from '@/features/merchants/merchant-name';

import { knownMerchantNames } from './categories';

export interface ResolvedMerchant {
  key: string;
  name: string;
  label: string;
  isAlias: boolean;
}

const extraSpellings: Record<string, string[]> = {
  Żabka: ['zabka nano'],
  'McDonald’s': ['mcdonalds', 'mc donalds', 'mcdonald s'],
  'RTV Euro AGD': ['euro rtv agd', 'euro agd'],
  'Pyszne.pl': ['pyszne pl', 'pyszne'],
  'Super-Pharm': ['super pharm', 'superpharm'],
  InPost: ['inpost paczkomat', 'paczkomat'],
  'E.Leclerc': ['leclerc'],
  'Piotr i Paweł': ['piotr pawel'],
  'Domino’s': ['dominos', 'domino s pizza'],
  Sphinx: ['sfinks'],
  'Green Caffè Nero': ['caffe nero'],
  'Uber Eats': ['ubereats'],
  'Free Now': ['freenow', 'mytaxi'],
  'PKP Intercity': ['intercity', 'pkp ic'],
  'Wizz Air': ['wizzair'],
  'Dr.Max': ['drmax'],
  'Lux Med': ['luxmed'],
  'Enel-Med': ['enelmed'],
  'Black Red White': ['brw'],
  'H&M': ['hm', 'hennes mauritz'],
  'Pull&Bear': ['pullbear', 'pull and bear'],
  'TK Maxx': ['tkmaxx'],
  'x-kom': ['xkom'],
  'Media Markt': ['mediamarkt'],
  'Cinema City': ['cinemacity'],
  PlayStation: ['playstation network', 'psn'],
  'HBO Max': ['hbomax'],
  'Disney+': ['disney plus'],
  'T-Mobile': ['tmobile'],
  'Canal+': ['canal plus'],
  'Poczta Polska': ['pocztex'],
  'W.Kruk': ['wkruk'],
  AliExpress: ['aliexpress com'],
  'Amazon Prime': ['prime video'],
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

const aliasEntries: AliasEntry[] = knownMerchantNames
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
