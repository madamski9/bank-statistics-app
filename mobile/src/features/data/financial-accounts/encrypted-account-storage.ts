import { encryptedDocument } from '@/features/data/local-storage/encrypted-document';

import type { AccountStorage } from './account-storage';

const accountsDocument = encryptedDocument(
  'bankstats.financial-accounts.v1',
  'bankstats-financial-accounts.json',
);

export const encryptedAccountStorage: AccountStorage = accountsDocument;

export function clearAccountStorage(): Promise<void> {
  return accountsDocument.clear();
}
