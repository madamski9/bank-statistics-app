import type { IngestionRecord } from '@bankstats/ingestion-native';

import { splitMerchant } from '@/features/merchants/merchant-name';

export type PartyKind = 'merchant' | 'counterparty' | 'unknown';

export interface Party {
  kind: PartyKind;
  name?: string;
  location?: string;
}

const transferTypes: IngestionRecord['transactionType'][] = [
  'outgoingTransfer',
  'incomingTransfer',
];

const businessWords = new Set([
  'apteka',
  'bar',
  'biedronka',
  'cukiernia',
  'firma',
  'hotel',
  'kawiarnia',
  'kiosk',
  'klinika',
  'market',
  'piekarnia',
  'pizzeria',
  'restauracja',
  'salon',
  'serwis',
  'sklep',
  'stacja',
  'studio',
  'warsztat',
]);

const capitalizedWord = /^\p{Lu}[\p{Ll}\p{Lu}'-]+$/u;

function looksLikePersonName(name: string): boolean {
  const words = name.split(' ');

  if (words.length < 2 || words.length > 3) {
    return false;
  }

  return words.every(
    (word) => capitalizedWord.test(word) && !businessWords.has(word.toLocaleLowerCase('pl')),
  );
}

export function classifyParty(record: IngestionRecord): Party {
  const raw = record.merchant?.replace(/\s+/gu, ' ').trim() ?? '';

  if (raw === '') {
    return { kind: 'unknown' };
  }

  if (transferTypes.includes(record.transactionType)) {
    return { kind: 'counterparty', name: raw };
  }

  if (record.transactionType === undefined && looksLikePersonName(raw)) {
    return { kind: 'counterparty', name: raw };
  }

  const { name, location } = splitMerchant(raw);

  return location === undefined
    ? { kind: 'merchant', name }
    : { kind: 'merchant', name, location };
}
