import { documentList } from '@/features/local-storage/document-list';
import { encryptedDocument } from '@/features/local-storage/encrypted-document';

import { isSpendingEvent } from './spending-event';

const eventsDocument = encryptedDocument('bankstats.events.v1');

export const eventStore = documentList(eventsDocument, isSpendingEvent);

export function clearEvents(): Promise<void> {
  return eventsDocument.clear();
}
