import { documentList } from '@/features/local-storage/document-list';
import { encryptedDocument } from '@/features/local-storage/encrypted-document';

import { isCustomCategory } from './custom-category';

const customCategoriesDocument = encryptedDocument('bankstats.custom-categories.v1');

export const customCategoryStore = documentList(customCategoriesDocument, isCustomCategory);

export function clearCustomCategories(): Promise<void> {
  return customCategoriesDocument.clear();
}
