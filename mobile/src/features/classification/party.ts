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

export interface PartyFields {
  kind: IngestionRecord['transactionType'];
  name: string | undefined;
}

export function classifyPartyFields({ kind, name }: PartyFields): Party {
  const raw = name?.replace(/\s+/gu, ' ').trim() ?? '';

  if (raw === '') {
    return { kind: 'unknown' };
  }

  if (transferTypes.includes(kind)) {
    return { kind: 'counterparty', name: raw };
  }

  if (kind === undefined && looksLikePersonName(raw)) {
    return { kind: 'counterparty', name: raw };
  }

  const merchant = splitMerchant(raw);

  return merchant.location === undefined
    ? { kind: 'merchant', name: merchant.name }
    : { kind: 'merchant', name: merchant.name, location: merchant.location };
}

export function classifyParty(record: IngestionRecord): Party {
  return classifyPartyFields({ kind: record.transactionType, name: record.merchant });
}
