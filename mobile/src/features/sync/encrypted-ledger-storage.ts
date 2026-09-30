import { encryptedDocument } from '@/features/local-storage/encrypted-document';

import type { LedgerStorage } from './sync-runner';

const ledgerDocument = encryptedDocument('bankstats.sync-ledger.v1', 'bankstats-sync-ledger.json');

export const encryptedLedgerStorage: LedgerStorage = ledgerDocument;

export function clearLedger(): Promise<void> {
  return ledgerDocument.clear();
}
